interface BadgeProps {
  children: React.ReactNode;
  variant: 'blue' | 'yellow' | 'purple' | 'green' | 'gray';
}

const variants = {
  blue: 'bg-blue-100 text-blue-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  purple: 'bg-purple-100 text-purple-800',
  green: 'bg-green-100 text-green-800',
  gray: 'bg-gray-100 text-gray-800',
};

export function Badge({ children, variant }: BadgeProps) {
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${variants[variant]}`}>
      {children}
    </span>
  );
}
