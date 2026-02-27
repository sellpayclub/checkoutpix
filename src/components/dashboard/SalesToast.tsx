import { useState, useCallback } from 'react';
import { DollarSign, ShoppingCart, X } from 'lucide-react';
import { useSalesNotifications } from '../../hooks/useSalesNotifications';

interface ToastData {
    id: number;
    type: 'new_order' | 'approved';
    customerName: string;
    productName: string;
    amount: number;
}

function formatPrice(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(cents / 100);
}

export function SalesToast() {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((notification: Omit<ToastData, 'id'>) => {
        const id = Date.now();
        setToasts(prev => [...prev, { ...notification, id }]);
        // Auto-dismiss after 8 seconds
        setTimeout(() => removeToast(id), 8000);
    }, [removeToast]);

    useSalesNotifications((notification) => {
        addToast(notification);
    });

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className="pointer-events-auto animate-slide-in-right bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border overflow-hidden"
                    style={{
                        borderColor: toast.type === 'approved' ? '#059669' : '#3b82f6',
                        animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                >
                    <div
                        className="h-1"
                        style={{
                            background: toast.type === 'approved'
                                ? 'linear-gradient(90deg, #059669, #10b981)'
                                : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                        }}
                    />
                    <div className="p-4 flex items-start gap-3">
                        {/* Icon */}
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                                background: toast.type === 'approved'
                                    ? 'linear-gradient(135deg, #059669, #047857)'
                                    : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            }}
                        >
                            {toast.type === 'approved' ? (
                                <DollarSign size={20} className="text-white" />
                            ) : (
                                <ShoppingCart size={20} className="text-white" />
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold uppercase tracking-wider"
                                    style={{
                                        color: toast.type === 'approved' ? '#059669' : '#3b82f6'
                                    }}
                                >
                                    {toast.type === 'approved' ? '💰 Venda Aprovada!' : '🛒 Novo Pedido!'}
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {toast.customerName.split(' ')[0]} — {toast.productName}
                            </p>
                            <p className="text-lg font-extrabold"
                                style={{
                                    color: toast.type === 'approved' ? '#059669' : '#3b82f6'
                                }}
                            >
                                {formatPrice(toast.amount)}
                            </p>
                        </div>

                        {/* Close */}
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ))}

            <style>{`
                @keyframes slideInRight {
                    from {
                        transform: translateX(120%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}
