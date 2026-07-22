import { queueStats, type TrackMeta } from "../lib/youtube";

type Props = {
  queue: string[];
  meta: Record<string, TrackMeta>;
  queueIndex: number;
  onPlay: (i: number) => void;
};

export function QueueList({ queue, meta, queueIndex, onPlay }: Props) {
  if (queue.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">{queueStats(queue, meta)}</p>
      <div className="thin-scroll flex max-h-44 flex-col gap-1 overflow-y-auto pr-1">
        {queue.map((id, i) => (
          <button
            key={`${id}-${i}`}
            type="button"
            onClick={() => onPlay(i)}
            className={`flex items-center gap-2 rounded-lg p-1 text-left transition-colors ${
              i === queueIndex ? "bg-white/15" : "hover:bg-white/10"
            }`}
          >
            <img
              src={meta[id]?.thumb ?? `https://i.ytimg.com/vi/${id}/default.jpg`}
              alt="default thumbnail"
              className="h-8 w-12 shrink-0 rounded object-cover"
            />
            <span className="flex min-w-0 flex-col">
              <span className={`truncate text-xs ${i === queueIndex ? "text-white" : "text-white/70"}`}>
                {meta[id]?.title ?? "Loading…"}
              </span>
              {meta[id]?.subtitle && <span className="truncate text-[10px] text-white/40">{meta[id].subtitle}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
