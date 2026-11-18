import { fetchPushInfo, removeSubscription, saveSubscription } from "../api/notifications.api";

export type PushSupport =
  | "supported"
  /** iPhone/iPad Safari tab: push only works once Noctis is opened from the Home Screen. */
  | "needs-install"
  | "unsupported";

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const apis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (apis) return "supported";
  return isIos() && !isStandalone() ? "needs-install" : "unsupported";
}

/** The service worker only exists in production builds (next-pwa is off in dev); `ready` would hang. */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) return null;
  return navigator.serviceWorker.ready;
}

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function sameKey(subscription: PushSubscription, key: Uint8Array): boolean {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const a = new Uint8Array(current);
  return a.length === key.length && a.every((byte, i) => byte === key[i]);
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await registration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export class PushSetupError extends Error {}

/** Asks for permission (must run from a tap), subscribes this browser and tells the API. */
export async function enablePush(): Promise<void> {
  const info = await fetchPushInfo();
  if (!info.publicKey) throw new PushSetupError("Push isn't configured on the server (VAPID keys missing).");

  const reg = await registration();
  if (!reg) throw new PushSetupError("The service worker isn't running. Reload the app and try again.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new PushSetupError("Notifications are blocked for Noctis in this browser.");

  const key = keyBytes(info.publicKey);
  let subscription = await reg.pushManager.getSubscription();
  // Subscribed with an older server key: that subscription can never receive, so replace it.
  if (subscription && !sameKey(subscription, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await saveSubscription(subscription.toJSON());
}

export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await removeSubscription(subscription.endpoint).catch(() => undefined);
  await subscription.unsubscribe();
}

/**
 * Re-sends this browser's subscription once per app load. Browsers rotate push endpoints, and a
 * server-side cleanup deletes dead ones, so this keeps the API's copy current without a tap.
 */
export async function syncPush(): Promise<void> {
  if (pushSupport() !== "supported" || Notification.permission !== "granted") return;
  const subscription = await currentSubscription();
  if (!subscription) return;
  const info = await fetchPushInfo();
  if (!info.publicKey) return;
  if (!sameKey(subscription, keyBytes(info.publicKey))) {
    // Server keys changed: subscribe again silently (permission is already granted).
    await subscription.unsubscribe();
    const reg = await registration();
    if (!reg) return;
    const fresh = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(info.publicKey) });
    await saveSubscription(fresh.toJSON());
    return;
  }
  await saveSubscription(subscription.toJSON());
}
