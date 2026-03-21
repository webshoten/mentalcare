const BARS = [3, 6, 9, 7, 4, 8, 5, 3, 7, 9, 6, 4, 8, 5, 3];

export function AudioWaveBars() {
  return (
    <div className="flex items-center gap-1 h-10">
      {BARS.map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-emerald-400 opacity-80"
          style={{
            height: `${h * 3}px`,
            animation: `pulse ${0.6 + (i % 3) * 0.2}s ease-in-out infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}
