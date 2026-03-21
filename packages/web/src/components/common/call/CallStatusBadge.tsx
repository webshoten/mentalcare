export function CallStatusBadge() {
  return (
    <div className="flex items-center gap-1.5 bg-emerald-900 rounded-full px-4 py-1.5">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-emerald-300 text-xs font-semibold">通話中</span>
    </div>
  );
}
