type Props = {
  name: string;
  photoUrl?: string | null;
};

const SPEED_LINES = [48, 28, 40, 20] as const;

export function RunningAvatar({ name, photoUrl }: Props) {
  return (
    <>
      <style>{`
        @keyframes runBounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes speedLine {
          0% { opacity: 0.6; width: var(--w); }
          100% { opacity: 0; width: calc(var(--w) * 0.2); }
        }
      `}</style>

      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-2 items-end">
          {SPEED_LINES.map((w, i) => (
            <div
              key={i}
              className="h-0.5 rounded-full bg-indigo-300"
              style={{
                width: w,
                // @ts-ignore
                "--w": `${w}px`,
                animation: `speedLine 0.55s ${i * 0.07}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>

        <div
          className="w-20 h-20 rounded-full overflow-hidden border-4 border-indigo-200 bg-orange-100 shrink-0"
          style={{ animation: "runBounce 0.45s ease-in-out infinite" }}
        >
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-orange-600 text-2xl font-bold">
              {name[0]}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
