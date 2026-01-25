import { cn } from '../../lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'primary' | 'success' | 'warning' | 'danger';
}

export function StatCard({ title, value, subtitle, icon, trend, color = 'primary' }: StatCardProps) {
    const iconBgStyles = {
        primary: 'gradient-primary',
        success: 'gradient-success',
        warning: 'gradient-warning',
        danger: 'gradient-danger',
    };

    return (
        <div className="stat-card animate-fade-in">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-tertiary)] mb-1">{title}</p>
                    <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{value}</p>
                    {subtitle && (
                        <p className="text-sm font-semibold text-[var(--accent-primary)] mt-1">{subtitle}</p>
                    )}
                    {trend && (
                        <div className="flex items-center gap-2 mt-3">
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full',
                                    trend.isPositive
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : 'bg-red-500/10 text-red-500'
                                )}
                            >
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-xs text-[var(--text-tertiary)]">vs. ontem</span>
                        </div>
                    )}
                </div>
                <div
                    className={cn(
                        'stat-icon shadow-lg',
                        iconBgStyles[color]
                    )}
                >
                    <span className="text-white">{icon}</span>
                </div>
            </div>
        </div>
    );
}
