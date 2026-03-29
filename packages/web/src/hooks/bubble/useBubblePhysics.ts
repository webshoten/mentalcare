import { useEffect, useRef, useState } from "react";
import { type Body, calcInitialLayout } from "@/utils/bubble/calcInitialLayout";

export type Position = {
  size: number;
  cx: number;
  cy: number;
};

type BubblePhysicsItem = {
  id: string;
};

const ASSUMED_W = 1200;
const ASSUMED_H = 580;
const MIN_GAP = 5;

// 中心引力: 各バブルをコンテナ中心へ引き寄せる。
// 差分の1.8%だけ移動させることで、遠いほど速く・近いほど減速する。
// ドラッグ中のバブルはユーザー操作優先のためスキップ。
function applyGravity(bs: Body[], W: number, H: number, dIdx: number | null) {
  const CX = W / 2;
  const CY = H / 2;
  for (let i = 0; i < bs.length; i++) {
    if (i === dIdx) continue;
    const b = bs[i];
    // 中心から離れてる方が速度が速い
    // バブルが中心より左にいる → CX - b.cx が正 → b.cx が増える → 右（中心方向）に動く
    // バブルが中心より右にいる → CX - b.cx が負 → b.cx が減る → 左（中心方向）に動く
    b.cx += (CX - b.cx) * 0.018;
    b.cy += (CY - b.cy) * 0.018;
    // 壁制約: バブルがコンテナ外にはみ出さないよう半径分の余白でクランプ
    b.cx = Math.max(b.r, Math.min(W - b.r, b.cx));
    b.cy = Math.max(b.r, Math.min(H - b.r, b.cy));
  }
}

// 衝突解消: 全ペアの重なりを位置修正で解消する。
// 速度ではなく位置を直接動かすことで、ばね振動を防ぐ。
// 1回のパスで玉突き的に新しい重なりが生まれるため、8回反復して収束させる。
function resolveCollisions(bs: Body[], dIdx: number | null) {
  const n = bs.length;
  for (let iter = 0; iter < 8; iter++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = bs[i].cx - bs[j].cx;
        const dy = bs[i].cy - bs[j].cy;
        const dist = Math.hypot(dx, dy) || 0.01; // i,j間の中心距離。同一座標時のゼロ除算防止
        const minDist = bs[i].r + bs[j].r + MIN_GAP; // 重なりなしで許容される最小距離
        // かさなっている場合
        if (dist < minDist) {
          // 例えば以下の場合
          // dist    = 170 - 100 = 70px（実際の距離）
          // minDist = 50 + 50 + 5 = 105px（必要な距離）
          // overlap = (105 - 70) / 2 = 17.5px（片側の押し出し量）
          // 35px 足りないので、半分の 17.5px ずつ負担します。
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist; // i→j方向のx単位ベクトル
          const ny = dy / dist; // i→j方向のy単位ベクトル
          // ドラッグ中のバブルは固定し、相手だけが全量動く
          if (i !== dIdx) {
            bs[i].cx += nx * overlap; // iはj->i方向へ
            bs[i].cy += ny * overlap; // iはj->i方向へ
          }
          if (j !== dIdx) {
            bs[j].cx -= nx * overlap; // jはi->j方向へ
            bs[j].cy -= ny * overlap; // jはi->j方向へ
          }
        }
      }
    }
  }
}

// 収束判定: このフレームで最も大きく動いたバブルの移動量を返す
function calcMaxDelta(bs: Body[], prevCx: number[], prevCy: number[], dIdx: number | null): number {
  let maxDelta = 0;
  for (let i = 0; i < bs.length; i++) {
    if (i === dIdx) continue;
    maxDelta = Math.max(
      maxDelta,
      Math.abs(bs[i].cx - prevCx[i]),
      Math.abs(bs[i].cy - prevCy[i]),
    );
  }
  return maxDelta;
}

export function useBubblePhysics(items: BubblePhysicsItem[]) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const bodiesRef = useRef<Body[]>([]);
  const rafRef = useRef<number | null>(null);
  const dragState = useRef<
    { idx: number; offsetX: number; offsetY: number } | null
  >(null);
  const dragMoved = useRef(false);
  const draggingIdxRef = useRef<number | null>(null);
  const awakeRef = useRef(false);

  const positionKey = items.map((a) => a.id).join(",");

  useEffect(() => {
    const W = containerRef.current?.clientWidth ?? ASSUMED_W;
    const H = containerRef.current?.clientHeight ?? ASSUMED_H;
    bodiesRef.current = calcInitialLayout(items.length, W, H);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKey]);

  // アニメーションの1フレーム処理を返す
  const frameFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const frame = () => {
      const bs = bodiesRef.current;
      const dIdx = draggingIdxRef.current;
      const W = containerRef.current?.clientWidth ?? ASSUMED_W;
      const H = containerRef.current?.clientHeight ?? ASSUMED_H;

      const prevCx = bs.map((b) => b.cx);
      const prevCy = bs.map((b) => b.cy);

      // 1. 中心引力: 全バブルをコンテナ中心へ引き寄せ、壁からはみ出さないようクランプ
      applyGravity(bs, W, H, dIdx);
      // 2. 衝突解消: 重なっているバブル同士を押し離す
      resolveCollisions(bs, dIdx);
      // 3. 収束判定: フレーム内の最大移動量を求める
      const maxDelta = calcMaxDelta(bs, prevCx, prevCy, dIdx);

      setPositions(bs.map((b) => ({ size: b.size, cx: b.cx, cy: b.cy })));

      // 全バブルの移動量が0.05px未満かつドラッグなし → 収束したのでスリープ。
      // ドラッグ中はスリープしない（指を離した後に衝突解消が必要なため）。
      if (maxDelta < 0.05 && dIdx === null) {
        awakeRef.current = false;
        return;
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    frameFnRef.current = frame;
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const wake = () => {
    if (awakeRef.current) return;
    awakeRef.current = true;
    rafRef.current = requestAnimationFrame(frameFnRef.current);
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
    b.cx = Math.max(
      b.r,
      Math.min(W - b.r, e.clientX - container.left - offsetX),
    );
    b.cy = Math.max(
      b.r,
      Math.min(H - b.r, e.clientY - container.top - offsetY),
    );
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
