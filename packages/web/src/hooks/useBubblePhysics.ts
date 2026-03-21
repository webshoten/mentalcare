import { useEffect, useRef, useState } from "react";

export type Position = {
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

type BubblePhysicsItem = {
  id: string;
  rating?: number | null;
};

const BUBBLE_SIZE = 140;
const ASSUMED_W = 1200;
const ASSUMED_H = 580;
const MIN_GAP = 5;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function bubbleSize(_rating: number | null | undefined): number {
  return BUBBLE_SIZE;
}

export function useBubblePhysics(items: BubblePhysicsItem[]) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const bodiesRef = useRef<Body[]>([]);
  const rafRef = useRef<number | null>(null);
  const dragState = useRef<{ idx: number; offsetX: number; offsetY: number } | null>(null);
  const dragMoved = useRef(false);
  const draggingIdxRef = useRef<number | null>(null);
  const awakeRef = useRef(false);

  const positionKey = items.map((a) => `${a.id}:${a.rating}`).join(",");

  useEffect(() => {
    const n = items.length;
    if (n === 0) { bodiesRef.current = []; return; }

    const W = containerRef.current?.clientWidth ?? ASSUMED_W;
    const H = containerRef.current?.clientHeight ?? ASSUMED_H;
    const CX = W / 2;
    const CY = H / 2;

    const rawSizes = items.map((a) => bubbleSize(a.rating));
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

      const prevCx = bs.map((b) => b.cx);
      const prevCy = bs.map((b) => b.cy);

      for (let i = 0; i < n; i++) {
        if (i === dIdx) continue;
        const b = bs[i];
        b.cx += (CX - b.cx) * 0.018;
        b.cy += (CY - b.cy) * 0.018;
        b.cx = Math.max(b.r, Math.min(W - b.r, b.cx));
        b.cy = Math.max(b.r, Math.min(H - b.r, b.cy));
      }

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

  useEffect(() => {
    if (bodiesRef.current.length > 0) wake();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKey]);

  const handleMouseDown = (e: React.MouseEvent, i: number) => {
    e.preventDefault();
    if (i < 0 || i >= items.length) return;
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
    wake();
    setPositions(bodiesRef.current.map((b) => ({
      size: b.size,
      cx: b.cx,
      cy: b.cy,
    })));
  };

  /** Returns `true` if the mouseUp was a click (not a drag). */
  const handleMouseUp = (_i: number): boolean => {
    const wasClick = !dragMoved.current;
    dragState.current = null;
    draggingIdxRef.current = null;
    setDraggingIdx(null);
    return wasClick;
  };

  const handleContainerMouseUp = () => {
    if (dragState.current !== null) {
      dragState.current = null;
      draggingIdxRef.current = null;
      setDraggingIdx(null);
    }
  };

  const handleMouseLeave = () => {
    dragState.current = null;
    draggingIdxRef.current = null;
    setDraggingIdx(null);
  };

  return {
    containerRef,
    positions,
    draggingIdx,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onContainerMouseUp: handleContainerMouseUp,
      onMouseLeave: handleMouseLeave,
    },
  };
}
