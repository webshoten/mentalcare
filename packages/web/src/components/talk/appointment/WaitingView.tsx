import { RunningAvatar } from "@/components/common/RunningAvatar";

type Props = {
  counselorName: string;
  photoUrl?: string | null;
  specialty?: string | null;
  onCancel: () => void;
};

export function WaitingView({ counselorName, photoUrl, specialty, onCancel }: Props) {
  return (
    <div className="flex flex-col items-center gap-8 pt-24">
      <RunningAvatar name={counselorName} photoUrl={photoUrl} />

      <div className="flex flex-col items-center gap-1">
        <p className="text-gray-900 text-xl font-bold">{counselorName} が向かっています</p>
        <p className="text-gray-400 text-xs mt-1">もう少しお待ちください</p>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
      >
        キャンセル
      </button>
    </div>
  );
}
