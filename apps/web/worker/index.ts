/**
 * Custom service-worker code. next-pwa bundles this folder (customWorkerSrc defaults to "worker")
 * and imports it into the generated public/sw.js, so it runs beside Workbox's caching.
 * Payload shape: PushPayload in ai/agent/src/push.ts.
 */
export {};

interface ExtendableEventLike {
  waitUntil(promise: Promise<unknown>): void;
}

interface PushEventLike extends ExtendableEventLike {
  data: { json(): unknown; text(): string } | null;
}

interface NotificationEventLike extends ExtendableEventLike {
  notification: Notification;
}

interface WindowClientLike {
  url: string;
  focus(): Promise<WindowClientLike>;
  navigate(url: string): Promise<WindowClientLike | null>;
}

interface ServiceWorkerScope {
  registration: ServiceWorkerRegistration;
  location: Location;
  clients: {
    matchAll(options: { type: "window"; includeUncontrolled: boolean }): Promise<WindowClientLike[]>;
    openWindow(url: string): Promise<WindowClientLike | null>;
  };
  addEventListener(type: "push", listener: (event: PushEventLike) => void): void;
  addEventListener(type: "notificationclick", listener: (event: NotificationEventLike) => void): void;
}

declare const self: ServiceWorkerScope;

interface Payload {
  title: string;
  message: string;
  url: string;
  tag?: string;
}

function readPayload(data: PushEventLike["data"]): Payload {
  const fallback: Payload = { title: "Noctis", message: "", url: "/dashboard" };
  if (!data) return fallback;
  try {
    const raw = data.json() as Partial<Payload>;
    return {
      title: typeof raw.title === "string" && raw.title ? raw.title : fallback.title,
      message: typeof raw.message === "string" ? raw.message : "",
      url: typeof raw.url === "string" && raw.url.startsWith("/") ? raw.url : fallback.url,
      tag: typeof raw.tag === "string" ? raw.tag : undefined,
    };
  } catch {
    return { ...fallback, message: data.text() };
  }
}

self.addEventListener("push", (event) => {
  const payload = readPayload(event.data);
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.message,
      icon: "/icons/icon-192.png",
      // Android's status bar draws this as a white silhouette; a full-colour icon shows as a blank square.
      badge: "/icons/badge-96.png",
      tag: payload.tag,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data as { url?: string } | null)?.url ?? "/dashboard";
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (!open) {
        await self.clients.openWindow(target);
        return;
      }
      const focused = await open.focus();
      if (focused.url !== target) await focused.navigate(target).catch(() => undefined);
    })(),
  );
});
