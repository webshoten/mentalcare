import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bookAppointment, fetchOpenAppointments } from "../../graphql/appointment";
import { QueryProvider } from "../QueryProvider";

type AppointmentCounselor = {
  id: string;
  name: string;
  photoUrl?: string | null;
  rating?: number | null;
  specialty?: string | null;
};

type Appointment = {
  id: string;
  counselorId: string;
  availability: string;
  counselor?: AppointmentCounselor | null;
};

type Position = {
  size: number;
  leftPct: number;
  topPct: number;
};

function statusInfo(availability: string) {
  switch (availability) {
    case "AVAILABLE":
      return { label: "● 今すぐ可", color: "#16A34A", dotColor: "#16A34A", bg: "#DCFCE7", border: "#86EFAC" };
    case "SOON":
      return { label: "◎ 15分後〜", color: "#B45309", dotColor: "#F59E0B", bg: "#FEF3C7", border: "#FCD34D" };
    case "LATER":
      return { label: "◎ 30分後〜", color: "#B45309", dotColor: "#F59E0B", bg: "#FEF3C7", border: "#FCD34D" };
    default:
      return { label: "—", color: "#6B7280", dotColor: "#9CA3AF", bg: "#F3F4F6", border: "#E5E7EB" };
  }
}

const BUBBLE_SIZE_MIN = 100;

function bubbleSize(rating: number | null | undefined): number {
  const r = Math.max(1, Math.min(5, rating ?? 3));
  return Math.round(BUBBLE_SIZE_MIN + ((r - 1) / 4) * 120);
}

function sr(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const ASSUMED_W = 1200;
const ASSUMED_H = 580;
const MIN_GAP = 16;

function computePositions(appointments: Appointment[]): Position[] {
  const placed: Array<{ cx: number; cy: number; r: number }> = [];

  return appointments.map((a, i) => {
    const size = bubbleSize(a.counselor?.rating);
    const r = size / 2;
    let cx = r;
    let cy = r;

    for (let attempt = 0; attempt < 300; attempt++) {
      const seed = i * 300 + attempt;
      const tryCx = r + sr(seed * 2) * (ASSUMED_W - size);
      const tryCy = r + sr(seed * 2 + 1) * (ASSUMED_H - size);

      const noOverlap = placed.every(
        (p) => Math.hypot(tryCx - p.cx, tryCy - p.cy) >= r + p.r + MIN_GAP,
      );

      cx = tryCx;
      cy = tryCy;
      if (noOverlap) break;
    }

    placed.push({ cx, cy, r });
    return {
      size,
      leftPct: (cx / ASSUMED_W) * 100,
      topPct: (cy / ASSUMED_H) * 100,
    };
  });
}

function BubbleCanvasInner() {
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const { mutate: beginSession, isPending: isStarting } = useMutation({
    mutationFn: (appointmentId: string) => bookAppointment(appointmentId),
    onSuccess: (data) => {
      window.location.href = `/talk/session/${data.bookAppointment.id}`;
    },
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ idx: number; offsetX: number; offsetY: number } | null>(null);
  const dragMoved = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["openAppointments"],
    queryFn: fetchOpenAppointments,
    refetchInterval: 20_000,
  });

  const appointments = (data?.openAppointments ?? []) as Appointment[];
  const positionKey = appointments.map((a) => `${a.id}:${a.counselor?.rating}`).join(",");

  const initialPositions = useMemo(
    () => computePositions(appointments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positionKey],
  );

  useEffect(() => {
    setPositions(initialPositions);
  }, [initialPositions]);

  const handleMouseDown = (e: React.MouseEvent, i: number) => {
    e.preventDefault();
    dragMoved.current = false;
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    const p = positions[i];
    if (!p) return;
    const bubbleCx = (p.leftPct / 100) * container.width;
    const bubbleCy = (p.topPct / 100) * container.height;
    dragState.current = {
      idx: i,
      offsetX: e.clientX - container.left - bubbleCx,
      offsetY: e.clientY - container.top - bubbleCy,
    };
    setDraggingIdx(i);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    dragMoved.current = true;
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    const { idx, offsetX, offsetY } = dragState.current;
    const newCx = e.clientX - container.left - offsetX;
    const newCy = e.clientY - container.top - offsetY;
    setPositions((prev) =>
      prev.map((p, j) =>
        j === idx
          ? {
              ...p,
              leftPct: Math.max(0, Math.min(100, (newCx / container.width) * 100)),
              topPct: Math.max(0, Math.min(100, (newCy / container.height) * 100)),
            }
          : p,
      ),
    );
  };

  const handleMouseUp = (i: number) => {
    if (!dragMoved.current) {
      setSelected(appointments[i]);
    }
    dragState.current = null;
    setDraggingIdx(null);
  };

  const handleMouseLeave = () => {
    dragState.current = null;
    setDraggingIdx(null);
  };

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

  const counselorName = selected?.counselor?.name ?? "カウンセラー";
  const photoUrl = selected?.counselor?.photoUrl;

  const dialog =
    selected &&
    createPortal(
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={() => setSelected(null)}
      >
        <div
          className="bg-white rounded-2xl flex flex-col items-center gap-5 w-96"
          style={{ padding: "56px 48px 48px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-24 h-24 rounded-full overflow-hidden shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt={counselorName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-orange-200 flex items-center justify-center text-orange-700 text-3xl font-bold">
                {counselorName[0]}
              </div>
            )}
          </div>

          {(() => {
            const s = statusInfo(selected.availability);
            return (
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: s.dotColor }} />
                {s.label}
              </div>
            );
          })()}

          <p className="text-xl font-bold text-gray-900 text-center">{counselorName}</p>

          <p className="text-sm text-gray-400 text-center">
            ★ {selected.counselor?.rating?.toFixed(1) ?? "—"}
          </p>

          <p className="text-sm text-gray-600 text-center leading-relaxed">
            {counselorName}さんに相談を始めますか？
            <br />
            音声での対話になります。
          </p>

          <div className="w-full h-px bg-gray-100" />

          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex-1 h-10 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={isStarting}
              onClick={() => beginSession(selected.id)}
              className="flex-1 h-10 rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium transition-colors"
            >
              {isStarting ? "接続中..." : "相談を始める"}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full select-none"
        style={{ minHeight: "calc(100svh - 220px)" }}
        onMouseMove={handleMouseMove}
        onMouseUp={() => {
          if (dragState.current !== null) {
            handleMouseUp(dragState.current.idx);
          }
        }}
        onMouseLeave={handleMouseLeave}
      >
        {positions.map((p, i) => {
          const a = appointments[i];
          if (!a || !p) return null;
          const overlayH = Math.round(p.size * 0.29);
          const nameFs = Math.max(10, Math.round(p.size * 0.059));
          const statusFs = Math.max(9, Math.round(p.size * 0.05));
          const isDragging = draggingIdx === i;
          const animIdx = (i % 3) + 1;
          const animDuration = 4 + sr(i * 7 + 3) * 3;
          const name = a.counselor?.name ?? "—";

          return (
            <div
              key={a.id}
              className="absolute rounded-full overflow-hidden"
              style={{
                width: p.size,
                height: p.size,
                left: `calc(${p.leftPct}% - ${p.size / 2}px)`,
                top: `calc(${p.topPct}% - ${p.size / 2}px)`,
                cursor: isDragging ? "grabbing" : "grab",
                zIndex: isDragging ? 10 : 1,
                boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.18)" : "0 2px 8px rgba(0,0,0,0.10)",
                transition: isDragging ? "none" : "box-shadow 0.2s",
                animation: isDragging ? "none" : `bubbleFloat${animIdx} ${animDuration}s ease-in-out infinite`,
              }}
              onMouseDown={(e) => handleMouseDown(e, i)}
              onMouseUp={() => handleMouseUp(i)}
            >
              {a.counselor?.photoUrl ? (
                <img
                  src={a.counselor.photoUrl}
                  alt={name}
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <div
                  className="w-full h-full bg-orange-200 flex items-center justify-center text-orange-700 font-bold pointer-events-none"
                  style={{ fontSize: Math.round(p.size * 0.3) }}
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
                    color: statusInfo(a.availability).color === "#16A34A" ? "#69F0AE" : "#FFB300",
                  }}
                >
                  {statusInfo(a.availability).label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {dialog}
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
