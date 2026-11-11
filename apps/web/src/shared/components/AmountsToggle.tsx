"use client";

import { Eye, EyeOff } from "lucide-react";
import { setAmountsHidden, useAmountsHidden } from "@/lib/amountsPrivacy";
import { Button } from "@/shared/components/ui/button";

/** Masks or reveals every money figure on the page. The choice is remembered on this browser. */
export function AmountsToggle() {
  const hidden = useAmountsHidden();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={hidden}
      onClick={() => setAmountsHidden(!hidden)}
    >
      {hidden ? <EyeOff /> : <Eye />}
      {hidden ? "Show amounts" : "Hide amounts"}
    </Button>
  );
}
