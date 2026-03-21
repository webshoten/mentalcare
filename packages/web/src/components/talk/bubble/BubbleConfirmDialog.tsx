import type { Appointment } from "@/lib/statusInfo";
import { Avatar } from "@/components/common/Avatar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { StatusBadge } from "@/components/common/StatusBadge";

type BubbleConfirmDialogProps = {
  selected: Appointment | null;
  onClose: () => void;
  onConfirm: () => void;
  isStarting: boolean;
};

export function BubbleConfirmDialog({ selected, onClose, onConfirm, isStarting }: BubbleConfirmDialogProps) {
  const counselorName = selected?.counselor?.name ?? "カウンセラー";
  const photoUrl = selected?.counselor?.photoUrl;

  return (
    <ConfirmDialog open={!!selected} onClose={onClose}>
      <div
        className="bg-white rounded-2xl flex flex-col items-center gap-5 w-96"
        style={{ padding: "56px 48px 48px" }}
      >
        <Avatar photoUrl={photoUrl} name={counselorName} size={96} />

        {selected && (
          <StatusBadge
            availability={selected.availability}
            status={selected.status}
            scheduledStart={selected.scheduledStart}
            scheduledEnd={selected.scheduledEnd}
          />
        )}

        <p className="text-xl font-bold text-gray-900 text-center">{counselorName}</p>

        <div className="w-full h-px bg-gray-100" />

        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={isStarting}
            onClick={onConfirm}
            className="flex-1 h-10 rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium transition-colors"
          >
            {isStarting ? "接続中..." : "相談を始める"}
          </button>
        </div>
      </div>
    </ConfirmDialog>
  );
}
