export type Body = {
  cx: number;
  cy: number;
  r: number;
  size: number;
};

const BUBBLE_SIZE = 140;
const MIN_GAP = 5;
// 黄金角（約137.5°）。この角度ずつ回転させると偏りなく均等に広がる。
// 円一周(2π)を黄金比(φ)で分割: 2π/φ² = π(3-√5)
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * バブルの初期位置を計算する。
 * 物理シミュレーションが衝突解消・壁制約で補正するため、
 * ここでは大まかに重ならない配置を作れれば十分。
 * 数が多くてはみ出ても、シミュレーションがコンテナ内に押し戻す。
 */
export function calcInitialLayout(
  count: number,
  containerWidth: number,
  containerHeight: number,
): Body[] {
  if (count === 0) return [];

  const cx = containerWidth / 2;
  const cy = containerHeight / 2;

  // バブル数が多いとき、互いに重なりすぎないようサイズを縮小する。
  // コンテナの60%を配置可能領域とし、全バブルの合計面積が超えたら
  // 面積比の平方根でサイズを一律スケールダウンする。
  const totalArea = count * Math.PI * (BUBBLE_SIZE / 2) ** 2;
  const availableArea = containerWidth * containerHeight * 0.6;
  const scaleFactor = totalArea > availableArea
    ? Math.sqrt(availableArea / totalArea)
    : 1;

  const size = Math.round(BUBBLE_SIZE * scaleFactor /** 0 ~ 1 */);
  const r = size / 2;

  // バブルを中心から螺旋状に並べて、初期状態で重なりにくくする。
  // 黄金角ずつ回転させると偏りなく均等に広がる。
  // √i で中心からの距離を徐々に広げる。
  return Array.from({ length: count }, (_, i) => {
    const spread = Math.sqrt(i) * (size + MIN_GAP);
    return {
      cx: cx + Math.cos(i * GOLDEN) * spread,
      cy: cy + Math.sin(i * GOLDEN) * spread,
      r,
      size,
    };
  });
}
