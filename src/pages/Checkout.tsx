import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Check, Copy, Shield, Lock, Clock, DollarSign, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '../components/ui';
import { getProduct, getPixels, getCheckoutSettings, createOrder, updateOrderStatus, getOrderBumps, recordCheckoutVisit } from '../lib/supabase';
import { createPixCharge, getChargeStatus, generateCorrelationId, formatPrice, cleanPhone } from '../lib/openpix';
import { sendPixGeneratedEmail, sendPurchaseApprovedEmail } from '../lib/resend';
import { formatTimer, isValidEmail, isValidPhone, isValidCPF, formatCPF, formatPhoneMask, copyToClipboard } from '../lib/utils';
import type { CheckoutFormData, ProductPlan } from '../types';

// Logo SellPay default
const SELLPAY_LOGO = 'https://xyzgvsuttwrvbyyxdppq.supabase.co/storage/v1/object/public/logos/logo%20sellpay.png';

interface OrderBumpData {
    id: string;
    name: string;
    title: string;
    description: string | null;
    price: number;
    image_url: string | null;
    box_color: string;
    text_color: string;
    button_text?: string | null;
}

export function Checkout() {
    const { productId, planId } = useParams();
    const navigate = useNavigate();
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Product data
    const [product, setProduct] = useState<{
        id: string;
        name: string;
        image_url: string | null;
        cover_image_url: string | null;
        plan: {
            name: string;
            price: number;
            is_recurring?: boolean;
            recurring_interval?: 'monthly' | 'yearly' | null;
        };
        deliverables: { type: string; file_url: string | null; redirect_url: string | null }[];
    } | null>(null);
    const [orderBumps, setOrderBumps] = useState<OrderBumpData[]>([]);
    const [settings, setSettings] = useState({
        timer_enabled: true,
        timer_text: 'Oferta por tempo limitado',
        timer_duration: 600,
        primary_color: '#059669',
        button_text: 'FINALIZAR COMPRA',
        footer_text: '© 2026 SellPay. Todos os direitos reservados.',
        cpf_enabled: false,
        order_bump_title: 'Aproveite essa oferta especial!',
        order_bump_button_text: 'Adicionar oferta',
    });
    const [pixels, setPixels] = useState<string[]>([]);

    // Form state
    const [form, setForm] = useState<CheckoutFormData>({ name: '', email: '', phone: '', cpf: '' });
    const [errors, setErrors] = useState<Partial<CheckoutFormData>>({});
    const [selectedBump, setSelectedBump] = useState<OrderBumpData | null>(null);

    // Refs to avoid stale closures in polling interval
    const productRef = useRef(product);
    const formRef = useRef(form);
    const selectedBumpRef = useRef(selectedBump);
    productRef.current = product;
    formRef.current = form;
    selectedBumpRef.current = selectedBump;

    // Timer
    const [timeLeft, setTimeLeft] = useState(600);

    // Payment state
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pixData, setPixData] = useState<{
        qrCode: string;
        brCode: string;
        correlationId: string;
    } | null>(null);
    const [isPaid, setIsPaid] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadData();
        firePixelEvent('PageView');
        if (productId) {
            recordCheckoutVisit(productId);
        }
    }, [productId, planId]);

    // Timer countdown
    useEffect(() => {
        if (!settings.timer_enabled || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [settings.timer_enabled, timeLeft]);

    // Calculate total using refs for stable access
    const calculateTotalFromRefs = useCallback((): number => {
        const currentProduct = productRef.current;
        if (!currentProduct) return 0;
        let total = currentProduct.plan.price;
        if (selectedBumpRef.current) {
            total += selectedBumpRef.current.price;
        }
        return total;
    }, []);

    // Poll for payment status
    useEffect(() => {
        if (!pixData?.correlationId || isPaid) return;

        pollingRef.current = setInterval(async () => {
            try {
                const status = await getChargeStatus(pixData.correlationId);
                if (status.status === 'COMPLETED') {
                    setIsPaid(true);
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    await updateOrderStatus(pixData.correlationId, 'APPROVED', status.paidAt);
                    firePixelEvent('Purchase', { value: calculateTotalFromRefs() / 100, currency: 'BRL' });

                    // Send purchase approved email (use refs for current values)
                    const currentProduct = productRef.current;
                    const currentForm = formRef.current;
                    if (currentProduct) {
                        const deliverable = currentProduct.deliverables?.[0];
                        await sendPurchaseApprovedEmail({
                            customerEmail: currentForm.email,
                            customerName: currentForm.name,
                            productName: currentProduct.name,
                            amount: calculateTotalFromRefs(),
                            accessUrl: deliverable?.redirect_url || undefined,
                            downloadUrl: deliverable?.file_url || undefined,
                        });
                    }

                    setTimeout(() => {
                        navigate(`/obrigado/${pixData.correlationId}`);
                    }, 2000);
                }
            } catch (error) {
                console.log('Verificando pagamento...');
            }
        }, 5000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [pixData?.correlationId, isPaid, calculateTotalFromRefs, navigate]);

    async function loadData() {
        if (!productId || !planId) {
            navigate('/');
            return;
        }

        try {
            const [productData, settingsData, pixelsData, bumpsData] = await Promise.all([
                getProduct(productId),
                getCheckoutSettings(),
                getPixels(),
                getOrderBumps(),
            ]);

            if (!productData) {
                navigate('/');
                return;
            }

            const plan = productData.product_plans?.find((p: ProductPlan) => p.id === planId);
            if (!plan) {
                navigate('/');
                return;
            }

            setProduct({
                id: productData.id,
                name: productData.name,
                image_url: productData.image_url,
                cover_image_url: productData.cover_image_url,
                plan: {
                    name: plan.name,
                    price: plan.price,
                    is_recurring: plan.is_recurring,
                    recurring_interval: plan.recurring_interval
                },
                deliverables: productData.product_deliverables || [],
            });

            // Load active order bumps linked to this product
            const productBumpIds = productData.order_bump_ids || [];
            const activeBumps = bumpsData?.filter((b: OrderBumpData & { is_active: boolean }) =>
                b.is_active && productBumpIds.includes(b.id)
            ) || [];
            setOrderBumps(activeBumps);

            if (settingsData) {
                setSettings({
                    ...settingsData,
                    cpf_enabled: settingsData.cpf_enabled ?? false,
                    order_bump_title: settingsData.order_bump_title || 'Aproveite essa oferta especial!',
                    order_bump_button_text: settingsData.order_bump_button_text || 'Adicionar oferta',
                });
                setTimeLeft(settingsData.timer_duration);
            }

            const activePixels = pixelsData?.filter((p: { is_active: boolean }) => p.is_active).map((p: { pixel_id: string }) => p.pixel_id) || [];
            setPixels(activePixels);

            firePixelEvent('InitiateCheckout');
        } catch (error) {
            console.error('Error loading checkout data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function firePixelEvent(event: string, data?: Record<string, unknown>) {
        if (typeof window !== 'undefined' && (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq) {
            pixels.forEach(() => {
                (window as unknown as { fbq: (...args: unknown[]) => void }).fbq('track', event, data);
            });
        }
    }

    function calculateTotal(): number {
        if (!product) return 0;
        let total = product.plan.price;
        if (selectedBump) {
            total += selectedBump.price;
        }
        return total;
    }

    function validateForm(): boolean {
        const newErrors: Partial<CheckoutFormData> = {};

        if (!form.name.trim()) {
            newErrors.name = 'Nome é obrigatório';
        }
        if (!form.email.trim()) {
            newErrors.email = 'Email é obrigatório';
        } else if (!isValidEmail(form.email)) {
            newErrors.email = 'Email inválido';
        }
        if (!form.phone.trim()) {
            newErrors.phone = 'Telefone é obrigatório';
        } else if (!isValidPhone(form.phone)) {
            newErrors.phone = 'Telefone inválido';
        }

        if (settings.cpf_enabled) {
            if (!form.cpf.trim()) {
                newErrors.cpf = 'CPF é obrigatório';
            } else if (!isValidCPF(form.cpf)) {
                newErrors.cpf = 'CPF inválido';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validateForm() || !product || !productId || !planId) return;

        setIsProcessing(true);
        try {
            const correlationId = generateCorrelationId();
            const total = calculateTotal();

            // Create PIX charge
            const chargeResponse = await createPixCharge({
                correlationID: correlationId,
                value: total,
                comment: `Compra: ${product.name}`,
                customer: {
                    name: form.name,
                    email: form.email,
                    phone: cleanPhone(form.phone),
                },
            });

            // Create order in database
            await createOrder({
                correlation_id: correlationId,
                product_id: productId,
                plan_id: planId,
                customer_name: form.name,
                customer_email: form.email,
                customer_phone: cleanPhone(form.phone),
                amount: total,
                pix_qr_code: chargeResponse.charge.qrCodeImage,
                pix_copy_paste: chargeResponse.charge.brCode,
                pix_charge_id: chargeResponse.charge.globalID,
                order_bump_id: selectedBump?.id || undefined,
            });

            // Send PIX generated email
            await sendPixGeneratedEmail({
                customerEmail: form.email,
                customerName: form.name,
                productName: product.name,
                amount: total,
                pixCode: chargeResponse.charge.brCode,
            });

            setPixData({
                qrCode: chargeResponse.charge.qrCodeImage,
                brCode: chargeResponse.charge.brCode,
                correlationId,
            });
        } catch (error) {
            console.error('Error creating charge:', error);
            alert('Erro ao gerar PIX. Verifique se a chave da OpenPix está configurada.');
        } finally {
            setIsProcessing(false);
        }
    }

    async function handleCopyCode() {
        if (!pixData?.brCode) return;
        const success = await copyToClipboard(pixData.brCode);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Produto não encontrado</p>
            </div>
        );
    }

    // Payment Success State
    if (isPaid) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center animate-fade-in">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Check size={48} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Confirmado!</h1>
                    <p className="text-gray-500 mb-6">Seu pagamento foi recebido com sucesso.</p>
                    <p className="text-sm text-gray-400">Redirecionando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Facebook Pixel */}
            {pixels.map((pixelId) => (
                <script key={pixelId} dangerouslySetInnerHTML={{
                    __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `
                }} />
            ))}

            {/* Timer Bar */}
            {settings.timer_enabled && timeLeft > 0 && (
                <div className="timer-bar" style={{ background: `linear-gradient(90deg, ${settings.primary_color} 0%, ${settings.primary_color}dd 100%)` }}>
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        {settings.timer_text}
                    </span>
                    <span className="font-bold text-lg ml-3">{formatTimer(timeLeft)}</span>
                </div>
            )}

            {/* Product Cover Image (Individual per product) - Full image with rounded corners */}
            {product.cover_image_url && (
                <div className="w-full bg-gray-100 px-4 pt-4">
                    <img
                        src={product.cover_image_url}
                        alt="Cover"
                        className="w-full h-auto max-h-80 object-cover mx-auto rounded-3xl shadow-xl"
                    />
                </div>
            )}

            <div className="max-w-lg mx-auto px-4 py-8">
                {/* Product Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6 overflow-hidden">
                    {/* Always show product image */}
                    {product.image_url && (
                        <div className="flex items-center gap-4 p-5 border-b border-gray-100">
                            <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-16 h-16 rounded-xl object-cover"
                            />
                            <div className="flex-1">
                                <h2 className="font-bold text-xl text-gray-900">{product.name}</h2>
                                <p className="text-sm text-gray-500">Plano: {product.plan.name}</p>
                            </div>
                        </div>
                    )}
                    <div className="p-5">
                        {!product.image_url && (
                            <>
                                <h2 className="font-bold text-xl text-gray-900 mb-1">{product.name}</h2>
                                <p className="text-sm text-gray-500 mb-2">Plano: {product.plan.name}</p>
                            </>
                        )}
                        <p className="text-3xl font-extrabold" style={{ color: settings.primary_color }}>
                            {formatPrice(product.plan.price)}
                            {product.plan.is_recurring && (
                                <span className="text-sm font-medium text-gray-400 ml-1">
                                    /{product.plan.recurring_interval === 'monthly' ? 'mês' : 'ano'}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Main Form / Payment */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
                    {!pixData ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Identification */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${settings.primary_color}15` }}>
                                        <User size={16} style={{ color: settings.primary_color }} />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Seus Dados</h3>
                                </div>

                                <div className="space-y-3">
                                    {/* Name Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome completo</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Ex: João da Silva"
                                                value={form.name}
                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-emerald-500 ${errors.name ? 'border-red-400' : 'border-transparent'}`}
                                            />
                                        </div>
                                        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                                    </div>

                                    {/* Email Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Seu melhor e-mail</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                <Mail size={18} />
                                            </div>
                                            <input
                                                type="email"
                                                placeholder="Ex: joao@email.com"
                                                value={form.email}
                                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-emerald-500 ${errors.email ? 'border-red-400' : 'border-transparent'}`}
                                            />
                                        </div>
                                        {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                                    </div>

                                    {/* Phone Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                <Phone size={18} />
                                            </div>
                                            <input
                                                type="tel"
                                                placeholder="(00) 00000-0000"
                                                value={form.phone}
                                                onChange={(e) => setForm({ ...form, phone: formatPhoneMask(e.target.value) })}
                                                className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-emerald-500 ${errors.phone ? 'border-red-400' : 'border-transparent'}`}
                                            />
                                        </div>
                                        {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
                                    </div>



                                    {/* CPF Input */}
                                    {settings.cpf_enabled && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                    <CreditCard size={18} />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="000.000.000-00"
                                                    value={form.cpf}
                                                    onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                                                    className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-emerald-500 ${errors.cpf ? 'border-red-400' : 'border-transparent'}`}
                                                />
                                            </div>
                                            {errors.cpf && <p className="text-sm text-red-500 mt-1">{errors.cpf}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Order Bumps with Images */}
                            {orderBumps.length > 0 && (
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={16} className="text-amber-500" />
                                        <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">{settings.order_bump_title}</h3>
                                    </div>

                                    {orderBumps.map((bump) => (
                                        <div
                                            key={bump.id}
                                            onClick={() => setSelectedBump(selectedBump?.id === bump.id ? null : bump)}
                                            className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedBump?.id === bump.id
                                                ? 'border-solid bg-emerald-50/30'
                                                : 'border-dashed border-gray-200 hover:border-gray-300'
                                                }`}
                                            style={selectedBump?.id === bump.id ? {
                                                borderColor: settings.primary_color,
                                                backgroundColor: `${settings.primary_color}08`
                                            } : undefined}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${selectedBump?.id === bump.id
                                                    ? 'bg-emerald-500 border-emerald-500'
                                                    : 'border-gray-300'
                                                    }`}
                                                    style={selectedBump?.id === bump.id ? { backgroundColor: settings.primary_color, borderColor: settings.primary_color } : undefined}
                                                >
                                                    {selectedBump?.id === bump.id && (
                                                        <Check size={12} className="text-white" />
                                                    )}
                                                </div>

                                                {/* Bump Image */}
                                                {bump.image_url && (
                                                    <img
                                                        src={bump.image_url}
                                                        alt={bump.name}
                                                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                                                    />
                                                )}

                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="font-bold text-gray-900 text-sm">{bump.title}</p>
                                                        <p className="font-bold text-sm whitespace-nowrap ml-2" style={{ color: settings.primary_color }}>
                                                            + {formatPrice(bump.price)}
                                                        </p>
                                                    </div>

                                                    {bump.description && (
                                                        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{bump.description}</p>
                                                    )}

                                                    <div className="mt-3 text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg inline-block transition-all"
                                                        style={{
                                                            backgroundColor: selectedBump?.id === bump.id ? settings.primary_color : `${settings.primary_color}15`,
                                                            color: selectedBump?.id === bump.id ? '#ffffff' : settings.primary_color
                                                        }}>
                                                        {selectedBump?.id === bump.id ? 'ADICIONADO' : (bump.button_text || settings.order_bump_button_text).toUpperCase()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Payment Method */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${settings.primary_color}15` }}>
                                        <DollarSign size={16} style={{ color: settings.primary_color }} />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Pagamento</h3>
                                </div>

                                <div
                                    className="flex items-center gap-3 p-4 rounded-xl border-2"
                                    style={{ borderColor: settings.primary_color, backgroundColor: `${settings.primary_color}08` }}
                                >
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                                        style={{ backgroundColor: settings.primary_color }}
                                    >
                                        <DollarSign size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">PIX</p>
                                        <p className="text-sm text-gray-500">Aprovação instantânea</p>
                                    </div>
                                    <div className="ml-auto">
                                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: settings.primary_color }}>
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: settings.primary_color }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Total */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-600">Total a pagar:</span>
                                    <span className="text-2xl font-extrabold" style={{ color: settings.primary_color }}>
                                        {formatPrice(calculateTotal())}
                                        {product.plan.is_recurring && !selectedBump && (
                                            <span className="text-xs font-medium text-gray-400 ml-1">
                                                /{product.plan.recurring_interval === 'monthly' ? 'mês' : 'ano'}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="w-full py-4 rounded-xl text-white font-bold text-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                                style={{
                                    backgroundColor: settings.primary_color,
                                    boxShadow: `0 4px 20px ${settings.primary_color}40`
                                }}
                            >
                                {isProcessing ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Lock size={20} />
                                        {settings.button_text}
                                    </>
                                )}
                            </button>

                            {/* Security Badge */}
                            <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Lock size={14} />
                                    100% Seguro
                                </span>
                                <span className="flex items-center gap-1">
                                    <Shield size={14} />
                                    SSL Criptografado
                                </span>
                            </div>
                        </form>
                    ) : (
                        /* PIX Payment Display */
                        <div className="text-center animate-fade-in">
                            <div className="mb-6">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Clock size={18} className="text-amber-500" />
                                    <span className="text-sm text-gray-500">Aguardando pagamento...</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Escaneie o QR Code</h3>
                                <p className="text-gray-500 text-sm mt-1">Use o app do seu banco para pagar</p>
                            </div>

                            {/* QR Code */}
                            <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 inline-block mb-6 shadow-inner">
                                <img
                                    src={pixData.qrCode}
                                    alt="QR Code PIX"
                                    className="w-56 h-56"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (!target.src.startsWith('data:')) {
                                            target.src = `data:image/png;base64,${pixData.qrCode}`;
                                        }
                                    }}
                                />
                            </div>

                            {/* Copy Code */}
                            <div className="mb-6">
                                <p className="text-sm text-gray-500 mb-2">Ou copie o código PIX:</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={pixData.brCode}
                                        readOnly
                                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 truncate"
                                    />
                                    <Button
                                        type="button"
                                        variant={copied ? 'primary' : 'secondary'}
                                        size="sm"
                                        icon={copied ? <Check size={16} /> : <Copy size={16} />}
                                        onClick={handleCopyCode}
                                    >
                                        {copied ? 'Copiado!' : 'Copiar'}
                                    </Button>
                                </div>
                            </div>

                            {/* Total */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <p className="text-sm text-gray-500">Valor a pagar:</p>
                                <p className="text-3xl font-extrabold" style={{ color: settings.primary_color }}>
                                    {formatPrice(calculateTotal())}
                                </p>
                            </div>

                            {/* Loading indicator */}
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                                <span>Verificando pagamento automaticamente...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer with Logo */}
                <div className="text-center">
                    <p className="text-xs text-gray-400 mb-3">{settings.footer_text}</p>
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-400 mb-4">
                        <span className="flex items-center gap-1">
                            <Lock size={12} />
                            Compra 100% segura
                        </span>
                        <span className="flex items-center gap-1">
                            <Shield size={12} />
                            Site protegido
                        </span>
                    </div>
                    {/* SellPay Logo in Footer */}
                    <img
                        src={SELLPAY_LOGO}
                        alt="SellPay"
                        className="h-6 mx-auto opacity-50 hover:opacity-80 transition-opacity"
                    />
                </div>
            </div>
        </div >
    );
}
