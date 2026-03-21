import { statusInfo } from "@/lib/statusInfo";
import type { Appointment } from "@/lib/statusInfo";
import type { Position } from "@/hooks/useBubblePhysics";

type BubbleItemProps = {
  appointment: Appointment;
  position: Position;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
};

export function BubbleItem({ appointment, position, isDragging, onMouseDown, onMouseUp }: BubbleItemProps) {
  const name = appointment.counselor?.name ?? "—";
  const si = statusInfo(appointment.availability, appointment.status, appointment.scheduledStart, appointment.scheduledEnd);
  const overlayH = Math.round(position.size * 0.29);
  const nameFs = Math.max(10, Math.round(position.size * 0.059));
  const statusFs = Math.max(9, Math.round(position.size * 0.05));

  return (
    <div
      className="absolute rounded-full overflow-hidden"
      style={{
        width: position.size,
        height: position.size,
        left: position.cx - position.size / 2,
        top: position.cy - position.size / 2,
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: isDragging ? 10 : 1,
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.18)" : "0 2px 8px rgba(0,0,0,0.10)",
        transition: isDragging ? "none" : "box-shadow 0.2s",
        opacity: si.disabled ? 0.4 : 1,
      }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      {appointment.counselor?.photoUrl ? (
        <img
          src={appointment.counselor.photoUrl}
          alt={name}
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <div
          className="w-full h-full bg-orange-200 flex items-center justify-center text-orange-700 font-bold pointer-events-none"
          style={{ fontSize: Math.round(position.size * 0.3) }}
        >
          {name[0]}
        </div>
      )}
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none"
        style={{ height: overlayH, background: "rgba(0,0,0,0.65)" }}
      >
        <span className="text-white font-bold leading-tight" style={{ fontSize: nameFs }}>
          {name}
        </span>
        <span
          className="font-semibold leading-tight"
          style={{
            fontSize: statusFs,
            color: si.disabled ? "#D1D5DB" : si.color === "#16A34A" ? "#69F0AE" : "#FFB300",
          }}
        >
          {si.label}
        </span>
      </div>
    </div>
  );
}
