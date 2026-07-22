import { Play, Pause, SkipBack, SkipForward, RotateCcw, Repeat, Repeat1 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

type Props = {
  playing: boolean;
  ready: boolean;
  canPrev: boolean;
  canNext: boolean;
  loop: "off" | "all" | "one";
  onPrev: () => void;
  onToggle: () => void;
  onNext: () => void;
  onReset: () => void;
  onCycleLoop: () => void;
};

export function PlayerControls({ playing, ready, canPrev, canNext, loop, onPrev, onToggle, onNext, onReset, onCycleLoop }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onCycleLoop}
        disabled={!ready}
        aria-label={`Loop: ${loop}`}
        aria-pressed={loop !== "off"}
        className={loop === "off" ? "text-white/40 hover:text-white" : "text-[var(--color-primary)]"}
      >
        {loop === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onPrev}
        disabled={!ready || !canPrev}
        aria-label="Previous track"
        className="text-white/80 hover:text-white"
      >
        <SkipBack className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onToggle}
        disabled={!ready}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={!ready || !canNext}
        aria-label="Next track"
        className="text-white/80 hover:text-white"
      >
        <SkipForward className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onReset}
        disabled={!ready}
        aria-label="Clear queue"
        className="text-white/80 hover:text-white"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
