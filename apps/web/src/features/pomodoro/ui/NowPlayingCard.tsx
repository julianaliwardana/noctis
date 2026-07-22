import { Marquee } from "@/shared/components/Marquee";

type Props = {
  art: string | null;
  title?: string;
  subtitle?: string;
};

export function NowPlayingCard({ art, title, subtitle }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {art ? (
        <img
          src={art}
          alt="thumbnail"
          className="aspect-square w-40 rounded-xl object-cover shadow-lg ring-1 ring-white/10"
        />
      ) : (
        <div className="aspect-square w-40 rounded-xl bg-white/5 ring-1 ring-white/10" />
      )}
      <div className="w-full px-2 text-center">
        <Marquee text={title ?? "Search a song to start playing"} className="text-sm font-medium text-white" />
        {subtitle && <p className="mt-0.5 truncate text-xs text-white/60">{subtitle}</p>}
      </div>
    </div>
  );
}
