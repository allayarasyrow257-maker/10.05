import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'gift';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        {
          'bg-purple-500/20 text-purple-300 border border-purple-500/30': variant === 'default',
          'bg-green-500/20 text-green-300 border border-green-500/30': variant === 'success',
          'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30': variant === 'warning',
          'bg-red-500/20 text-red-300 border border-red-500/30': variant === 'error',
          'bg-pink-500/20 text-pink-300 border border-pink-500/30': variant === 'gift',
        },
        className
      )}
      {...props}
    />
  );
}
