import { cn } from '../../lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    className?: string;
    dot?: boolean;
}

export function Badge({ children, variant = 'default', size = 'sm', className, dot = false }: BadgeProps) {
    const variants = {
        default: 'badge-default',
        success: 'badge-success',
        warning: 'badge-warning',
        danger: 'badge-danger',
        info: 'bg-blue-500/10 text-blue-500',
    };

    const sizes = {
        sm: 'px-2.5 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
    };

    return (
        <span
            className={cn(
                'badge-premium',
                variants[variant],
                sizes[size],
                className
            )}
        >
            {dot && (
                <span className={cn(
                    'w-1.5 h-1.5 rounded-full animate-pulse',
                    variant === 'success' && 'bg-green-500',
                    variant === 'warning' && 'bg-amber-500',
                    variant === 'danger' && 'bg-red-500',
                    variant === 'info' && 'bg-blue-500',
                    variant === 'default' && 'bg-[var(--text-tertiary)]'
                )} />
            )}
            {children}
        </span>
    );
}
