"use client";

import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { clearToken } from "@/lib/auth";
import { useSessionStore } from "@/lib/session";

/**
 * Shown when a refresh could not renew the session. The page stays where it is so nothing the
 * user was mid-way through is thrown away by a surprise redirect.
 */
export function SessionExpiredDialog() {
  const router = useRouter();
  const expired = useSessionStore((state) => state.expired);
  const reset = useSessionStore((state) => state.reset);

  function signIn(): void {
    clearToken();
    reset();
    router.replace("/login");
  }

  return (
    <Dialog open={expired} onOpenChange={(open) => !open && reset()}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Session expired</DialogTitle>
          <DialogDescription>
            You&apos;ve been signed out after a period of inactivity. Sign in again to pick up where you left off.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={reset}>
            Stay on this page
          </Button>
          <Button type="button" onClick={signIn}>
            <LogIn />
            Sign in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
