"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { sendTestPush } from "../api/notifications.api";
import { PushSetupError, currentSubscription, disablePush, enablePush, pushSupport } from "../lib/push";
import type { PushSupport } from "../lib/push";

type Status = "loading" | "on" | "off" | "blocked" | PushSupport;

async function readStatus(): Promise<Status> {
  const support = pushSupport();
  if (support !== "supported") return support;
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  return (await currentSubscription()) ? "on" : "off";
}

/** Profile card: turn push on for this device, send a test, or turn it off. */
export function NotificationsCard() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const refresh = useCallback(() => {
    readStatus()
      .then(setStatus)
      .catch(() => setStatus("off"));
  }, []);

  useEffect(refresh, [refresh]);

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      const text = error instanceof PushSetupError ? error.message : "Something went wrong. Try again.";
      setMessage({ tone: "error", text });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  const turnOn = () =>
    run(async () => {
      await enablePush();
      setMessage({ tone: "ok", text: "This device will get Noctis notifications." });
    });

  const turnOff = () =>
    run(async () => {
      await disablePush();
      setMessage({ tone: "ok", text: "Notifications are off on this device." });
    });

  const test = () =>
    run(async () => {
      const { delivered } = await sendTestPush();
      setMessage(
        delivered > 0
          ? { tone: "ok", text: `Test sent to ${delivered} ${delivered === 1 ? "device" : "devices"}.` }
          : { tone: "error", text: "No device accepted the test. Turn notifications off and on again." },
      );
    });

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium text-[var(--color-text)]">Notifications</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Tasks due, habits left for today, upcoming subscription payments, budget alerts and Noctis nudges.
            Turn it on for each device you want them on.
          </p>
        </div>

        {status === "needs-install" && (
          <p className="text-xs text-[var(--color-text-muted)]">
            On iPhone, add Noctis to your Home Screen (Share → Add to Home Screen), open it from there, then turn
            notifications on here.
          </p>
        )}
        {status === "unsupported" && (
          <p className="text-xs text-[var(--color-text-muted)]">This browser can&apos;t receive web push.</p>
        )}
        {status === "blocked" && (
          <p className="text-xs text-destructive">
            Notifications are blocked for Noctis. Allow them in the browser&apos;s site settings (or the phone&apos;s app
            settings for the installed app), then come back.
          </p>
        )}

        {(status === "off" || status === "on" || status === "loading") && (
          <div className="flex flex-wrap items-center gap-2">
            {status === "on" ? (
              <>
                <Button type="button" size="sm" disabled={busy} onClick={() => void test()}>
                  <Send />
                  Send test
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void turnOff()}>
                  <BellOff />
                  Turn off on this device
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" disabled={busy || status === "loading"} onClick={() => void turnOn()}>
                <Bell />
                {busy ? "Turning on…" : "Turn on notifications"}
              </Button>
            )}
          </div>
        )}

        {message && (
          <p className={message.tone === "error" ? "text-xs text-destructive" : "text-xs text-[var(--color-text-muted)]"}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
