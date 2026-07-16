const blobs = [
  { color: "var(--color-primary)", top: "-15%", left: "-10%", size: "34rem", duration: "24s", delay: "0s" },
  { color: "var(--color-finance)", top: "10%", right: "-15%", size: "30rem", duration: "30s", delay: "-8s" },
  { color: "var(--color-habits)", bottom: "-20%", left: "20%", size: "32rem", duration: "27s", delay: "-15s" },
];

export function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {blobs.map((blob, index) => (
        <div
          key={index}
          className="absolute rounded-full opacity-40 blur-3xl"
          style={{
            backgroundColor: blob.color,
            top: blob.top,
            left: blob.left,
            right: blob.right,
            bottom: blob.bottom,
            width: blob.size,
            height: blob.size,
            animation: `aurora-drift ${blob.duration} ease-in-out infinite alternate`,
            animationDelay: blob.delay,
          }}
        />
      ))}
    </div>
  );
}
