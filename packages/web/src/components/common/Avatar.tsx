type AvatarProps = {
  photoUrl?: string | null;
  name: string;
  size: number;
  className?: string;
  fallbackClassName?: string;
};

export function Avatar({
  photoUrl,
  name,
  size,
  className = "",
  fallbackClassName = "bg-orange-200 text-orange-700",
}: AvatarProps) {
  const initial = name[0] ?? "?";

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-bold ${fallbackClassName}`}
          style={{ fontSize: Math.round(size * 0.35) }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
