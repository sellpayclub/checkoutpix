import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Download, ExternalLink, Facebook } from 'lucide-react';
import { Button } from '../components/ui';
import { getOrderByCorrelationId, getPixels } from '../lib/supabase';
import { formatPrice } from '../lib/openpix';
import type { Order } from '../types';

declare global {
    interface Window {
        fbq: any;
        _fbq: any;
    }
}

export function Obrigado() {
    const { correlationId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pixels, setPixels] = useState<string[]>([]);
    const [resent, setResent] = useState(false);

    useEffect(() => {
        loadPixels();
    }, []);

    async function loadPixels() {
        try {
            const pixelsData = await getPixels();
            const activePixels = pixelsData?.filter((p: any) => p.is_active).map((p: any) => p.pixel_id) || [];
            setPixels(activePixels);
        } catch (error) {
            console.error('Error loading pixels:', error);
        }
    }

    // Initialize Pixels
    useEffect(() => {
        if (pixels.length === 0) return;

        if (!window.fbq) {
            (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
                if (f.fbq) return; n = f.fbq = function () {
                    n.callMethod ?
                        n.callMethod.apply(n, arguments) : n.queue.push(arguments)
                };
                if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
                n.queue = []; t = b.createElement(e); t.async = !0;
                t.src = v; s = b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t, s)
            })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        }

        pixels.forEach(id => {
            window.fbq('init', id);
        });

        // Use trackSingle to ensure all pixels get the event
        pixels.forEach(id => {
            window.fbq('trackSingle', id, 'PageView');
        });
    }, [pixels]);

    function firePixelEvent(event: string, data?: Record<string, unknown>) {
        if (typeof window !== 'undefined' && window.fbq) {
            pixels.forEach(id => {
                window.fbq('trackSingle', id, event, data);
            });
        }
    }

    function handleManualResend() {
        if (!order) return;
        firePixelEvent('Purchase', {
            value: order.amount / 100,
            currency: 'BRL',
            content_name: order.product?.name
        });
        setResent(true);
        setTimeout(() => setResent(false), 3000);
    }

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

            // Track Purchase
            setTimeout(() => {
                firePixelEvent('Purchase', {
                    value: orderData.amount / 100,
                    currency: 'BRL',
                    content_name: orderData.product?.name
                });
            }, 500); // Reduced to 500ms to ensure it fires before redirect

            // Check for redirect
            const deliverable = orderData.product?.product_deliverables?.[0];
            if (deliverable?.type === 'redirect' && deliverable.redirect_url) {
                // Show page briefly then redirect - increased to 3 seconds to allow pixels to fire
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
                <p className="text-gray-500 mb-4">
                    Olá <strong>{order.customer_name.split(' ')[0]}</strong>, seu pagamento foi confirmado!
                </p>

                <div className="mb-6">
                    <button
                        onClick={handleManualResend}
                        disabled={resent}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 mx-auto ${resent
                            ? 'bg-green-50 text-green-600 border-green-200'
                            : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                            }`}
                    >
                        {resent ? (
                            <><Check size={12} /> Evento Enviado!</>
                        ) : (
                            <><Facebook size={12} /> Reenviar Pixel de Compra</>
                        )}
                    </button>
                    {!resent && (
                        <p className="text-[10px] text-gray-400 mt-1">
                            Use se notar que a conversão não apareceu no seu painel
                        </p>
                    )}
                </div>

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
