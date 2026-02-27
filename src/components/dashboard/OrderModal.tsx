import { useState } from 'react';
import { X, User, Mail, Phone, ShoppingCart, AlertTriangle, Send, Copy, CheckCircle2 } from 'lucide-react';
import { Button, Badge } from '../ui';
import { sendPixExpiredEmail, sendAbandonedCartEmail } from '../../lib/resend';
import { formatPrice } from '../../lib/openpix';
import { formatDateTime, getStatusLabel } from '../../lib/utils';
import type { Order } from '../../lib/supabase';

interface OrderModalProps {
    order: Order | null;
    onClose: () => void;
}

export function OrderModal({ order, onClose }: OrderModalProps) {
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [copiedPix, setCopiedPix] = useState(false);

    if (!order) return null;

    async function handleCopyPix() {
        if (!order?.pix_copy_paste) return;
        try {
            await navigator.clipboard.writeText(order.pix_copy_paste);
            setCopiedPix(true);
            setTimeout(() => setCopiedPix(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    }

    async function handleSendRecovery() {
        if (!order) return;
        setIsSendingEmail(true);
        try {
            // Construct checkout URL (assuming pattern /checkout/:productId/:planId)
            const checkoutUrl = `${window.location.origin}/checkout/${order.product_id}/${order.plan_id}`;

            await sendAbandonedCartEmail({
                customerEmail: order.customer_email,
                customerName: order.customer_name,
                productName: order.product?.name || 'Produto',
                checkoutUrl
            });
            alert('Email de recuperação enviado com sucesso!');
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Erro ao enviar email');
        } finally {
            setIsSendingEmail(false);
        }
    }

    async function handleSendExpired() {
        if (!order) return;
        setIsSendingEmail(true);
        try {
            const checkoutUrl = `${window.location.origin}/checkout/${order.product_id}/${order.plan_id}`;

            await sendPixExpiredEmail({
                customerEmail: order.customer_email,
                customerName: order.customer_name,
                productName: order.product?.name || 'Produto',
                checkoutUrl
            });
            alert('Email de Pix expirado enviado com sucesso!');
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Erro ao enviar email');
        } finally {
            setIsSendingEmail(false);
        }
    }

    async function handleResendAccess() {
        if (!order) return;
        setIsSendingEmail(true);
        try {
            const { sendPurchaseApprovedEmail } = await import('../../lib/resend');
            await sendPurchaseApprovedEmail({
                customerEmail: order.customer_email,
                customerName: order.customer_name,
                productName: order.product?.name || 'Produto',
                amount: order.amount,
                deliverables: order.product?.product_deliverables || []
            });
            alert('Email de acesso reenviado com sucesso!');
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Erro ao enviar email');
        } finally {
            setIsSendingEmail(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in futuristic-border">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
                    <div>
                        <h2 className="text-xl font-black text-[var(--text-primary)] italic">DETALHES <span className="text-[var(--accent-primary)]">PEDIDO</span></h2>
                        <p className="text-xs font-mono text-[var(--text-tertiary)] mt-1">{order.correlation_id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl transition-all"
                    >
                        <X size={20} className="text-[var(--text-secondary)]" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Customer Info */}
                    <div className="bg-[var(--bg-tertiary)] rounded-2xl p-5 border border-[var(--border-subtle)]">
                        <h3 className="text-xs font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <User size={14} className="text-[var(--accent-primary)]" />
                            CLIENTE
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                                    <User size={16} />
                                </div>
                                <span className="text-[var(--text-primary)] font-bold">{order.customer_name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                                    <Mail size={16} />
                                </div>
                                <span className="text-[var(--text-secondary)] font-medium">{order.customer_email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                                    <Phone size={16} />
                                </div>
                                <span className="text-[var(--text-secondary)] font-medium">{order.customer_phone || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Order Info */}
                    <div className="bg-[var(--bg-tertiary)] rounded-2xl p-5 border border-[var(--border-subtle)]">
                        <h3 className="text-xs font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ShoppingCart size={14} className="text-[var(--accent-primary)]" />
                            TRANSAÇÃO
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-[var(--text-tertiary)]">Produto / Plano</span>
                                <div className="text-right">
                                    <p className="font-bold text-[var(--text-primary)]">{order.product?.name || order.order_bump?.name || 'Venda Direta'}</p>
                                    <p className="text-xs text-[var(--text-secondary)]">{order.plan?.name || order.order_bump?.title || '-'}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)]">
                                <span className="text-sm text-[var(--text-tertiary)]">Valor Final</span>
                                <span className="font-black text-2xl text-[var(--accent-primary)] glow-text">{formatPrice(order.amount)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)]">
                                <span className="text-sm text-[var(--text-tertiary)]">Status</span>
                                <Badge
                                    variant={
                                        order.status === 'APPROVED' ? 'success' :
                                            order.status === 'PENDING' ? 'warning' :
                                                order.status === 'REFUNDED' ? 'danger' : 'default'
                                    }
                                    dot
                                >
                                    {getStatusLabel(order.status)}
                                </Badge>
                            </div>
                            <div className="flex justify-between pt-3 border-t border-[var(--border-subtle)]">
                                <span className="text-sm text-[var(--text-tertiary)]">Data de Criação</span>
                                <span className="text-sm font-medium text-[var(--text-secondary)]">{formatDateTime(order.created_at)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions & PIX Information for Pending/Expired */}
                    {(order.status === 'PENDING' || order.status === 'EXPIRED') && (
                        <div className="space-y-4">
                            {/* PIX Copy section */}
                            {order.pix_copy_paste && (
                                <div className="bg-[var(--bg-tertiary)] rounded-2xl p-5 border border-[var(--border-subtle)]">
                                    <h3 className="text-xs font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                                        PIX COPIA E COLA
                                    </h3>
                                    <div className="flex flex-col gap-3">
                                        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm text-[var(--text-primary)] font-mono break-all max-h-24 overflow-y-auto">
                                            {order.pix_copy_paste}
                                        </div>
                                        <Button
                                            onClick={handleCopyPix}
                                            variant="secondary"
                                            className="w-full"
                                            icon={<Copy size={16} />}
                                        >
                                            {copiedPix ? 'Copiado!' : 'Copiar Código PIX'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Recovery Actions */}
                            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <AlertTriangle size={14} />
                                    AÇÕES DE RECUPERAÇÃO
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        onClick={handleSendRecovery}
                                        isLoading={isSendingEmail}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                        icon={<Send size={16} />}
                                    >
                                        Enviar Recuperação
                                    </Button>
                                    <Button
                                        onClick={handleSendExpired}
                                        isLoading={isSendingEmail}
                                        size="sm"
                                        variant="secondary"
                                        className="border-amber-200 text-amber-700 hover:bg-amber-100"
                                        icon={<AlertTriangle size={16} />}
                                    >
                                        Pix Expirado
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Approved Actions */}
                    {order.status === 'APPROVED' && (
                        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <CheckCircle2 size={14} />
                                AÇÕES DE ENTREGA
                            </h3>
                            <Button
                                onClick={handleResendAccess}
                                isLoading={isSendingEmail}
                                size="sm"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                icon={<Send size={16} />}
                            >
                                Reenviar Acesso ao Produto
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-[var(--bg-tertiary)]/30 border-t border-[var(--border-color)]">
                    <Button variant="secondary" className="w-full" onClick={onClose}>
                        VOLTAR
                    </Button>
                </div>
            </div>
        </div>
    );
}
