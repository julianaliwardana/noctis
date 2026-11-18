import { api } from "@/lib/api";

export interface PushInfo {
  /** Null when the server has no VAPID keys. */
  publicKey: string | null;
  /** Devices currently subscribed for this account. */
  devices: number;
}

export function fetchPushInfo(): Promise<PushInfo> {
  return api.get<PushInfo>("/notifications/push");
}

export function saveSubscription(subscription: PushSubscriptionJSON): Promise<{ ok: true }> {
  return api.post<{ ok: true }>("/notifications/subscribe", { subscription });
}

export function removeSubscription(endpoint: string): Promise<void> {
  return api.post<void>("/notifications/unsubscribe", { endpoint });
}

export function sendTestPush(): Promise<{ delivered: number }> {
  return api.post<{ delivered: number }>("/notifications/test");
}
