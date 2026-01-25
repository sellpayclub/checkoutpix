import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Download, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui';
import { getOrderByCorrelationId } from '../lib/supabase';
import { formatPrice } from '../lib/openpix';
import type { Order } from '../types';

export function Obrigado() {
    const { correlationId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOrder();
    }, [correlationId]);

    async function loadOrder() {
        if (!correlationId) {
            navigate('/');
            return;
        }

        try {
            const orderData = await getOrderByCorrelationId(correlationId);

            if (!orderData || orderData.status !== 'APPROVED') {
                navigate('/');
                return;
            }

            setOrder(orderData as Order);

            // Check for redirect
            const deliverable = orderData.product?.product_deliverables?.[0];
            if (deliverable?.type === 'redirect' && deliverable.redirect_url) {
                // Show page briefly then redirect
                setTimeout(() => {
                    window.location.href = deliverable.redirect_url!;
                }, 3000);
            }
        } catch (error) {
            console.error('Error loading order:', error);
            navigate('/');
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (!order) {
        return null;
    }

    const deliverable = order.product?.product_deliverables?.[0];

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center animate-fade-in">
                {/* Success Icon */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/30">
                    <Check size={48} className="text-white" />
                </div>

                {/* Thank You */}
                <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
                    Obrigado! 🎉
                </h1>
                <p className="text-gray-500 mb-8">
                    Olá <strong>{order.customer_name.split(' ')[0]}</strong>, seu pagamento foi confirmado!
                </p>

                {/* Order Info */}
                <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left">
                    <div className="flex justify-between mb-3">
                        <span className="text-gray-500">Produto</span>
                        <span className="font-semibold text-gray-900">{order.product?.name}</span>
                    </div>
                    <div className="flex justify-between mb-3">
                        <span className="text-gray-500">Valor</span>
                        <span className="font-bold text-emerald-600">{formatPrice(order.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Email</span>
                        <span className="text-gray-900">{order.customer_email}</span>
                    </div>
                </div>

                {/* Deliverable Action */}
                {deliverable && (
                    <div className="mb-8">
                        {deliverable.type === 'file' && deliverable.file_url ? (
                            <a href={deliverable.file_url} download className="block">
                                <Button className="w-full" size="lg" icon={<Download size={20} />}>
                                    Baixar Produto
                                </Button>
                            </a>
                        ) : deliverable.type === 'redirect' && deliverable.redirect_url ? (
                            <div>
                                <p className="text-sm text-gray-400 mb-4">Redirecionando em instantes...</p>
                                <a href={deliverable.redirect_url} className="block">
                                    <Button className="w-full" size="lg" icon={<ExternalLink size={20} />}>
                                        Acessar Conteúdo
                                    </Button>
                                </a>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Footer */}
                <p className="text-xs text-gray-400">
                    © 2026 SellPay. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
