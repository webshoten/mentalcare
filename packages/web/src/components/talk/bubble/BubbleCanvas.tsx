import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { joinAppointment } from "@/graphql/appointment";
import { useBubblePhysics } from "@/hooks/useBubblePhysics";
import { useOpenAppointments } from "@/hooks/useOpenAppointments";
import { statusInfo } from "@/lib/statusInfo";
import type { Appointment } from "@/lib/statusInfo";
import { QueryProvider } from "@/components/QueryProvider";
import { BubbleConfirmDialog } from "./BubbleConfirmDialog";
import { BubbleItem } from "./BubbleItem";

function BubbleCanvasInner() {
  const [selected, setSelected] = useState<Appointment | null>(null);

  // MVP: Seed で作成した talker-1 を使用
  const TALKER_ID = "talker-1";

  const { mutate: beginSession, isPending: isStarting } = useMutation({
    mutationFn: (appointmentId: string) => joinAppointment(appointmentId, TALKER_ID),
    onSuccess: (data) => {
      window.location.href = `/talk/appointment/${data.joinAppointment.appointment.id}`;
    },
  });

  const { appointments, isLoading } = useOpenAppointments();
  const physicsItems = appointments.map((a) => ({ id: a.id, rating: a.counselor?.rating }));
  const { containerRef, positions, draggingIdx, handlers } = useBubblePhysics(physicsItems);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        読み込み中...
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        現在対応可能なカウンセラーはいません
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full select-none"
        style={{ minHeight: "calc(100svh - 220px)" }}
        onMouseMove={handlers.onMouseMove}
        onMouseUp={handlers.onContainerMouseUp}
        onMouseLeave={handlers.onMouseLeave}
      >
        {positions.map((p, i) => {
          const a = appointments[i];
          if (!a || !p) return null;
          return (
            <BubbleItem
              key={a.id}
              appointment={a}
              position={p}
              isDragging={draggingIdx === i}
              onMouseDown={(e) => handlers.onMouseDown(e, i)}
              onMouseUp={() => {
                const wasClick = handlers.onMouseUp(i);
                if (wasClick && !statusInfo(a.availability, a.status).disabled) {
                  setSelected(a);
                }
              }}
            />
          );
        })}
      </div>

      <BubbleConfirmDialog
        selected={selected}
        onClose={() => setSelected(null)}
        onConfirm={() => selected && beginSession(selected.id)}
        isStarting={isStarting}
      />
    </>
  );
}

export function BubbleCanvas() {
  return (
    <QueryProvider>
      <BubbleCanvasInner />
    </QueryProvider>
  );
}
