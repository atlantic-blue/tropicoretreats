export interface UnreadBadgeProps {
  count: number | undefined;
}

export function UnreadBadge({ count }: UnreadBadgeProps) {
  if (!count || count <= 0) return null;

  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-blue-500 text-white text-xs font-medium rounded-full">
      {count > 99 ? '99+' : count}
    </span>
  );
}
