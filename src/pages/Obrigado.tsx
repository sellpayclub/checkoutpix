import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Download, ExternalLink, Facebook as FbIcon, PlaySquare } from 'lucide-react';
import { Button } from '../components/ui';
import { getOrderByCorrelationId, getPixels, getGooglePixels } from '../lib/supabase';
import { formatPrice } from '../lib/openpix';
import type { Order, GooglePixel } from '../types';

import { getTrackingParameters, sendToUtmify, getUserIP, formatToUtmifyDate, getCurrentDateTime } from '../lib/utmify';

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
    const [googlePixels, setGooglePixels] = useState<GooglePixel[]>([]);
    const [resent, setResent] = useState(false);

    useEffect(() => {
        loadPixels();
    }, []);

    async function loadPixels() {
        try {
            const [pixelsData, googlePixelsData] = await Promise.all([
                getPixels(),
                getGooglePixels()
            ]);
            const activePixels = pixelsData?.filter((p: any) => p.is_active).map((p: any) => p.pixel_id) || [];
            setPixels(activePixels);

            const activeGooglePixels = googlePixelsData?.filter((p: GooglePixel) => p.is_active) || [];
            setGooglePixels(activeGooglePixels);
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

    // Initialize Google Ads Pixels
    useEffect(() => {
        if (googlePixels.length === 0) return;

        if (!(window as any).dataLayer) {
            (window as any).dataLayer = (window as any).dataLayer || [];
            (window as any).gtag = function () {
                (window as any).dataLayer.push(arguments);
            };
            (window as any).gtag('js', new Date());

            const script = document.createElement('script');
            script.src = `https://www.googletagmanager.com/gtag/js?id=${googlePixels[0].pixel_id}`;
            script.async = true;
            document.head.appendChild(script);
        }

        googlePixels.forEach(pixel => {
            (window as any).gtag('config', pixel.pixel_id);
        });

        // Fire page_view
        const tracking = getTrackingParameters();
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'page_view', tracking as any);
        }
    }, [googlePixels]);

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

        if (googlePixels.length > 0 && (window as any).gtag) {
            googlePixels.forEach(pixel => {
                const sendTo = pixel.conversion_label ? `${pixel.pixel_id}/${pixel.conversion_label}` : pixel.pixel_id;
                (window as any).gtag('event', 'conversion', {
                    send_to: sendTo,
                    value: order.amount / 100,
                    currency: 'BRL',
                    transaction_id: order.correlation_id
                });
            });
        }

        setResent(true);
        setTimeout(() => setResent(false), 3000);
    }

    useEffect(() => {
        loadOrder();
    }, [correlationId]);

    // Track Purchase as soon as order and pixels are ready
    useEffect(() => {
        if (order && pixels.length > 0 && (window as any).fbq) {
            const correlationId = order.correlation_id;
            const storageKey = `tracked_purchase_${correlationId}`;

            // Deduplicate: Don't fire if already fired (either here or on checkout page)
            if (!localStorage.getItem(storageKey)) {
                // Re-init for Advanced Matching
                pixels.forEach(id => {
                    (window as any).fbq('init', id, {
                        em: order.customer_email.toLowerCase().trim(),
                        fn: (order.customer_name || '').split(' ')[0].toLowerCase().trim(),
                        ln: ((order.customer_name || '').split(' ').slice(1).join(' ') || '').toLowerCase().trim(),
                        ph: order.customer_phone.replace(/\D/g, '')
                    });
                });

                firePixelEvent('Purchase', {
                    ...getTrackingParameters(),
                    value: order.amount / 100,
                    currency: 'BRL',
                    content_name: order.product?.name,
                    content_type: 'product',
                    content_ids: [
                        order.product_id,
                        ...(order.order_bump_id ? [order.order_bump_id] : [])
                    ],
                    num_items: 1 + (order.order_bump_id ? 1 : 0)
                });
                localStorage.setItem(storageKey, 'true');
                console.log('[Pixel] Purchase tracking fired in Thank You page with Advanced Matching');
            } else {
                console.log('[Pixel] Purchase already tracked for:', correlationId);
            }
        }

        // Google Ads Track Purchase
        if (order && googlePixels.length > 0 && (window as any).gtag) {
            const correlationId = order.correlation_id;
            const googleStorageKey = `tracked_google_purchase_${correlationId}`;

            if (!localStorage.getItem(googleStorageKey)) {
                googlePixels.forEach(pixel => {
                    const sendTo = pixel.conversion_label ? `${pixel.pixel_id}/${pixel.conversion_label}` : pixel.pixel_id;
                    (window as any).gtag('event', 'conversion', {
                        send_to: sendTo,
                        value: order.amount / 100,
                        currency: 'BRL',
                        transaction_id: correlationId
                    });
                });
                localStorage.setItem(googleStorageKey, 'true');
                console.log('[Google Pixel] Purchase tracking fired in Thank You page');
            }
        }
    }, [order, pixels, googlePixels]);

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
            setIsLoading(false);

            // Notify Utmify Fallback (Paid)
            const utmifyStorageKey = `utmify_paid_${correlationId}`;
            if (!localStorage.getItem(utmifyStorageKey)) {
                const ip = await getUserIP();
                const total = orderData.amount;

                void sendToUtmify({
                    orderId: correlationId!,
                    platform: 'SellPay',
                    paymentMethod: 'pix',
                    status: 'paid',
                    createdAt: formatToUtmifyDate(orderData.created_at),
                    approvedDate: orderData.paid_at ? formatToUtmifyDate(orderData.paid_at) : getCurrentDateTime(),
                    refundedAt: null,
                    customer: {
                        name: orderData.customer_name,
                        email: orderData.customer_email,
                        phone: orderData.customer_phone.replace(/\D/g, ''),
                        document: null,
                        ip: ip
                    },
                    products: [
                        {
                            id: orderData.product?.id || '',
                            name: orderData.product?.name || '',
                            planId: orderData.plan_id || null,
                            planName: null,
                            quantity: 1,
                            priceInCents: orderData.amount
                        }
                    ],
                    trackingParameters: getTrackingParameters(),
                    commission: {
                        totalPriceInCents: total,
                        gatewayFeeInCents: Math.round(total * 0.05),
                        userCommissionInCents: total > 0 ? Math.max(1, Math.round(total * 0.95)) : 0
                    }
                });
                localStorage.setItem(utmifyStorageKey, 'true');
            }

            // Handle redirect - find the FIRST redirect deliverable
            const allDeliverables = orderData.product?.product_deliverables || [];
            const redirectDeliverable = allDeliverables.find(
                (d: any) => d.type === 'redirect' && d.redirect_url
            );
            if (redirectDeliverable?.redirect_url) {
                setTimeout(() => {
                    try {
                        const tracking = getTrackingParameters();
                        const url = new URL(redirectDeliverable.redirect_url!);
                        Object.entries(tracking).forEach(([key, value]) => {
                            if (value) url.searchParams.set(key, value);
                        });
                        window.location.href = url.toString();
                    } catch (e) {
                        window.location.href = redirectDeliverable.redirect_url!;
                    }
                }, 5000); // 5s delay to allow pixels to fire
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

    const allDeliverables = order.product?.product_deliverables || [];
    const redirectDeliverable = allDeliverables.find(d => d.type === 'redirect' && d.redirect_url);

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
                            <><Check size={12} /> Eventos Enviados!</>
                        ) : (
                            <div className="flex items-center gap-1.5 pt-1 pb-1">
                                <FbIcon size={12} /> <PlaySquare size={12} className="text-orange-500" /> Reenviar Eventos de Compra
                            </div>
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

                {/* Deliverable Actions - show ALL */}
                {allDeliverables.length > 0 && (
                    <div className="mb-8 space-y-3">
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Seu Acesso:</h3>
                        {allDeliverables.map((d, index) => {
                            if (d.type === 'file' && d.file_url) {
                                return (
                                    <a key={index} href={d.file_url} download className="block">
                                        <Button className="w-full" size="lg" icon={<Download size={20} />}>
                                            Baixar Arquivo {allDeliverables.length > 1 ? (index + 1) : ''}
                                        </Button>
                                    </a>
                                );
                            } else if (d.type === 'redirect' && d.redirect_url) {
                                return (
                                    <a key={index} href={d.redirect_url} className="block">
                                        <Button className="w-full" size="lg" icon={<ExternalLink size={20} />}>
                                            Acessar Conteúdo {allDeliverables.length > 1 ? (index + 1) : ''}
                                        </Button>
                                    </a>
                                );
                            }
                            return null;
                        })}
                        {redirectDeliverable && (
                            <p className="text-sm text-gray-400 mt-2">Redirecionando automaticamente em instantes...</p>
                        )}
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
