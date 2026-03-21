import { statusInfo } from "@/lib/statusInfo";

type StatusBadgeProps = {
  availability: string;
  status?: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
};

export function StatusBadge({ availability, status, scheduledStart, scheduledEnd }: StatusBadgeProps) {
  const s = statusInfo(availability, status, scheduledStart, scheduledEnd);

  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: s.dotColor }} />
      {s.label}
    </div>
  );
}
