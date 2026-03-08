import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { joinAppointment, fetchOpenAppointments } from "../../graphql/appointment";
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
  status: string;
  availability: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  counselor?: AppointmentCounselor | null;
};

type Position = {
  size: number;
  cx: number;
  cy: number;
};

type Body = {
  cx: number;
  cy: number;
  r: number;
  size: number;
};

function statusInfo(availability: string, status?: string, scheduledStart?: string | null, scheduledEnd?: string | null) {
  if (status === "ACTIVE") {
    return { label: "● 通話中", color: "#9CA3AF", dotColor: "#9CA3AF", bg: "#F3F4F6", border: "#E5E7EB", disabled: true };
  }
  if (status === "WAITING") {
    return { label: "● 待機中", color: "#16A34A", dotColor: "#16A34A", bg: "#DCFCE7", border: "#86EFAC", disabled: false };
  }
  switch (availability) {
    case "AVAILABLE":
      return { label: "● 今すぐ可", color: "#16A34A", dotColor: "#16A34A", bg: "#DCFCE7", border: "#86EFAC", disabled: false };
    case "SOON":
      return { label: "◎ 15分後〜", color: "#B45309", dotColor: "#F59E0B", bg: "#FEF3C7", border: "#FCD34D", disabled: false };
    case "LATER":
      return { label: "◎ 30分後〜", color: "#B45309", dotColor: "#F59E0B", bg: "#FEF3C7", border: "#FCD34D", disabled: false };
    default: {
      const label = scheduledStart && scheduledEnd ? `${scheduledStart} 〜 ${scheduledEnd}` : "● オフライン";
      return { label, color: "#9CA3AF", dotColor: "#9CA3AF", bg: "#F3F4F6", border: "#E5E7EB", disabled: true };
    }
  }
}

const BUBBLE_SIZE = 140;

function bubbleSize(_rating: number | null | undefined): number {
  return BUBBLE_SIZE;
}

const ASSUMED_W = 1200;
const ASSUMED_H = 580;
const MIN_GAP = 5;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function BubbleCanvasInner() {
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const { mutate: beginSession, isPending: isStarting } = useMutation({
    mutationFn: (appointmentId: string) => joinAppointment(appointmentId),
    onSuccess: (data) => {
      window.location.href = `/talk/appointment/${data.joinAppointment.id}`;
    },
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const bodiesRef = useRef<Body[]>([]);
  const rafRef = useRef<number | null>(null);
  const dragState = useRef<{ idx: number; offsetX: number; offsetY: number } | null>(null);
  const dragMoved = useRef(false);
  const draggingIdxRef = useRef<number | null>(null);
  const awakeRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["openAppointments"],
    queryFn: fetchOpenAppointments,
    refetchInterval: 20_000,
  });

  const appointments = (data?.openAppointments ?? []) as Appointment[];
  const positionKey = appointments.map((a) => `${a.id}:${a.counselor?.rating}`).join(",");

  // アポイントメントが変わったら物理ボディを初期化
  useEffect(() => {
    const n = appointments.length;
    if (n === 0) { bodiesRef.current = []; return; }

    const W = containerRef.current?.clientWidth ?? ASSUMED_W;
    const H = containerRef.current?.clientHeight ?? ASSUMED_H;
    const CX = W / 2;
    const CY = H / 2;

    const rawSizes = appointments.map((a) => bubbleSize(a.counselor?.rating));
    const totalArea = rawSizes.reduce((sum, s) => sum + Math.PI * (s / 2) ** 2, 0);
    const availableArea = W * H * 0.6;
    const scaleFactor = totalArea > availableArea ? Math.sqrt(availableArea / totalArea) : 1;

    bodiesRef.current = rawSizes.map((rawS, i) => {
      const size = Math.round(rawS * scaleFactor);
      const spread = Math.sqrt(i) * (size + MIN_GAP);
      return {
        cx: CX + Math.cos(i * GOLDEN) * spread,
        cy: CY + Math.sin(i * GOLDEN) * spread,
        r: size / 2,
        size,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKey]);

  // 物理演算ループ（収束したら自動停止）
  const tickRef = useRef<() => void>(() => {});

  useEffect(() => {
    const tick = () => {
      const bs = bodiesRef.current;
      const n = bs.length;
      const dIdx = draggingIdxRef.current;

      const W = containerRef.current?.clientWidth ?? ASSUMED_W;
      const H = containerRef.current?.clientHeight ?? ASSUMED_H;
      const CX = W / 2;
      const CY = H / 2;

      // フレーム前の位置を記録（収束判定用）
      const prevCx = bs.map((b) => b.cx);
      const prevCy = bs.map((b) => b.cy);

      // 中心への引き寄せ（衝突解消の前に適用）
      for (let i = 0; i < n; i++) {
        if (i === dIdx) continue;
        const b = bs[i];
        b.cx += (CX - b.cx) * 0.018;
        b.cy += (CY - b.cy) * 0.018;
        b.cx = Math.max(b.r, Math.min(W - b.r, b.cx));
        b.cy = Math.max(b.r, Math.min(H - b.r, b.cy));
      }

      // 衝突解消（複数パスで確実に解消）
      for (let iter = 0; iter < 8; iter++) {
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const a = bs[i];
            const b = bs[j];
            const dx = a.cx - b.cx;
            const dy = a.cy - b.cy;
            const dist = Math.hypot(dx, dy) || 0.01;
            const minDist = a.r + b.r + MIN_GAP;
            if (dist < minDist) {
              const overlap = (minDist - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;
              if (i !== dIdx) { a.cx += nx * overlap; a.cy += ny * overlap; }
              if (j !== dIdx) { b.cx -= nx * overlap; b.cy -= ny * overlap; }
            }
          }
        }
      }

      // 今フレームで実際に動いた最大距離（px）で収束を判定
      let maxDelta = 0;
      for (let i = 0; i < n; i++) {
        if (i === dIdx) continue;
        maxDelta = Math.max(maxDelta, Math.abs(bs[i].cx - prevCx[i]), Math.abs(bs[i].cy - prevCy[i]));
      }

      setPositions(bs.map((b) => ({
        size: b.size,
        cx: b.cx,
        cy: b.cy,
      })));

      // 動きが十分小さければスリープ
      if (maxDelta < 0.05 && dIdx === null) {
        awakeRef.current = false;
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    tickRef.current = tick;
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const wake = () => {
    if (awakeRef.current) return;
    awakeRef.current = true;
    rafRef.current = requestAnimationFrame(tickRef.current);
  };

  // 初期配置後にウェイク
  useEffect(() => {
    if (bodiesRef.current.length > 0) wake();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKey]);

  const handleMouseDown = (e: React.MouseEvent, i: number) => {
    e.preventDefault();
    const a = appointments[i];
    if (!a) return;
    dragMoved.current = false;
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    const b = bodiesRef.current[i];
    if (!b) return;
    dragState.current = {
      idx: i,
      offsetX: e.clientX - container.left - b.cx,
      offsetY: e.clientY - container.top - b.cy,
    };
    draggingIdxRef.current = i;
    setDraggingIdx(i);
    wake();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    dragMoved.current = true;
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    const { idx, offsetX, offsetY } = dragState.current;
    const b = bodiesRef.current[idx];
    if (!b) return;
    const W = container.width;
    const H = container.height;
    b.cx = Math.max(b.r, Math.min(W - b.r, e.clientX - container.left - offsetX));
    b.cy = Math.max(b.r, Math.min(H - b.r, e.clientY - container.top - offsetY));
    // RAFの起動を待たず直接描画更新、衝突も起こすためにも wake する
    wake();
    setPositions(bodiesRef.current.map((b) => ({
      size: b.size,
      leftPct: (b.cx / ASSUMED_W) * 100,
      topPct: (b.cy / ASSUMED_H) * 100,
    })));
  };

  const handleMouseUp = (i: number) => {
    if (!dragMoved.current) {
      const a = appointments[i];
      if (a && !statusInfo(a.availability, a.status).disabled) {
        setSelected(a);
      }
    }
    dragState.current = null;
    draggingIdxRef.current = null;
    setDraggingIdx(null);
  };

  const handleMouseLeave = () => {
    dragState.current = null;
    draggingIdxRef.current = null;
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
            const s = statusInfo(selected.availability, selected.status, selected.scheduledStart, selected.scheduledEnd);
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
          const name = a.counselor?.name ?? "—";
          const si = statusInfo(a.availability, a.status, a.scheduledStart, a.scheduledEnd);

          return (
            <div
              key={a.id}
              className="absolute rounded-full overflow-hidden"
              style={{
                width: p.size,
                height: p.size,
                left: p.cx - p.size / 2,
                top: p.cy - p.size / 2,
                cursor: isDragging ? "grabbing" : "grab",
                zIndex: isDragging ? 10 : 1,
                boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.18)" : "0 2px 8px rgba(0,0,0,0.10)",
                transition: isDragging ? "none" : "box-shadow 0.2s",
                opacity: si.disabled ? 0.4 : 1,
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
                    color: si.disabled ? "#D1D5DB" : si.color === "#16A34A" ? "#69F0AE" : "#FFB300",
                  }}
                >
                  {si.label}
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
