import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

type Props = {
  playing: boolean;
  ready: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onToggle: () => void;
  onNext: () => void;
  onReset: () => void;
};

export function PlayerControls({ playing, ready, canPrev, canNext, onPrev, onToggle, onNext, onReset }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
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
