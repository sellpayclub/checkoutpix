import { cn } from '../../lib/utils';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    glow?: boolean;
}

export function Card({ children, className, hover = false, padding = 'md', glow = false }: CardProps) {
    const paddingStyles = {
        none: '',
        sm: 'p-5',
        md: 'p-6',
        lg: 'p-8',
    };

    return (
        <div
            className={cn(
                'card-premium',
                paddingStyles[padding],
                hover && 'cursor-pointer',
                glow && 'border-glow',
                className
            )}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    icon?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action, icon }: CardHeaderProps) {
    return (
        <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)]">
                        {icon}
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
                    {subtitle && (
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
                    )}
                </div>
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
