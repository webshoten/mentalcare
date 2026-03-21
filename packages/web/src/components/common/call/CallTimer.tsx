type Props = {
  elapsedSec: number;
};

export function CallTimer({ elapsedSec }: Props) {
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return <p className="text-gray-400 text-sm tabular-nums">{mm}:{ss}</p>;
}
