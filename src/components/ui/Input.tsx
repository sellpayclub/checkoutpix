import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon, className, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none z-10">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            'input-premium',
                            icon && 'pl-12',
                            error && 'border-red-400 focus:border-red-500',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                        <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
