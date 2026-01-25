import { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, ShoppingCart, X, User, Mail, Phone, Send, AlertTriangle } from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';
import { getOrders, getProducts } from '../lib/supabase';
import { sendPixExpiredEmail, sendAbandonedCartEmail } from '../lib/resend';
import { formatPrice } from '../lib/openpix';
import { formatDateTime, getStatusLabel } from '../lib/utils';
import type { Order, Product } from '../types';

interface OrderModalProps {
    order: Order | null;
    onClose: () => void;
}

function OrderModal({ order, onClose }: OrderModalProps) {
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    if (!order) return null;

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
                                <span className="text-[var(--text-primary)] font-bold">{order.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                                    <Mail size={16} />
                                </div>
                                <span className="text-[var(--text-secondary)] font-medium">{order.customer_email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                                    <Phone size={16} />
                                </div>
                                <span className="text-[var(--text-secondary)] font-medium">{order.customer_phone}</span>
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
                                    <p className="font-bold text-[var(--text-primary)]">{order.product?.name || '-'}</p>
                                    <p className="text-xs text-[var(--text-secondary)]">{order.plan?.name || '-'}</p>
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

                    {/* Actions for Pending/Expired */}
                    {(order.status === 'PENDING' || order.status === 'EXPIRED') && (
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

export function Vendas() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [productFilter, setProductFilter] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [ordersData, productsData] = await Promise.all([
                getOrders(),
                getProducts(),
            ]);
            setOrders(ordersData as Order[] || []);
            setProducts(productsData as Product[] || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function applyFilters() {
        setIsLoading(true);
        try {
            const data = await getOrders({
                status: statusFilter || undefined,
                productId: productFilter || undefined,
            });
            setOrders(data as Order[] || []);
        } catch (error) {
            console.error('Error filtering orders:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function exportCSV() {
        const headers = ['Data', 'Cliente', 'Email', 'Telefone', 'Produto', 'Valor', 'Status'];
        const rows = filteredOrders.map(order => [
            formatDateTime(order.created_at),
            order.customer_name,
            order.customer_email,
            order.customer_phone,
            order.product?.name || '-',
            formatPrice(order.amount),
            getStatusLabel(order.status),
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vendas_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    const filteredOrders = orders.filter(order => {
        if (search) {
            const searchLower = search.toLowerCase();
            if (!order.customer_name.toLowerCase().includes(searchLower) &&
                !order.customer_email.toLowerCase().includes(searchLower)) {
                return false;
            }
        }
        return true;
    });

    const stats = {
        total: orders.length,
        approved: orders.filter(o => o.status === 'APPROVED').length,
        pending: orders.filter(o => o.status === 'PENDING').length,
        revenue: orders.filter(o => o.status === 'APPROVED').reduce((acc, o) => acc + o.amount, 0),
        pendingValue: orders.filter(o => o.status === 'PENDING').reduce((acc, o) => acc + o.amount, 0),
    };

    if (isLoading) {
        return (
            <div className="p-8 gradient-mesh min-h-screen animate-pulse">
                <div className="h-12 bg-[var(--bg-card)] rounded-xl w-48 mb-8 shadow-sm" />
                <div className="h-96 bg-[var(--bg-card)] rounded-2xl shadow-sm" />
            </div>
        );
    }

    return (
        <div className="p-8 gradient-mesh min-h-screen">
            {/* Modal */}
            <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />

            {/* Header */}
            <div className="flex items-center justify-between mb-10 relative">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight italic">
                        VEN<span className="text-[var(--accent-primary)]">DAS</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1 font-medium">Fluxo de transações em tempo real</p>
                </div>
                <Button variant="secondary" icon={<Download size={18} />} onClick={exportCSV} className="relative z-10">
                    Exportar CSV
                </Button>
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--accent-primary)] opacity-[0.03] blur-[100px] rounded-full" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="stat-card">
                    <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Pedidos</p>
                    <p className="text-2xl font-black text-[var(--text-primary)]">{stats.total}</p>
                </div>
                <div className="stat-card border-l-4 border-emerald-500">
                    <p className="text-xs font-bold text-emerald-500/70 uppercase tracking-wider mb-1">Aprovadas</p>
                    <p className="text-2xl font-black text-emerald-500">{stats.approved}</p>
                </div>
                <div className="stat-card border-l-4 border-amber-500">
                    <p className="text-xs font-bold text-amber-500/70 uppercase tracking-wider mb-1">Pendentes</p>
                    <p className="text-2xl font-black text-amber-500">{stats.pending}</p>
                </div>
                <div className="stat-card">
                    <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Receita</p>
                    <p className="text-xl font-black text-[var(--text-primary)]">{formatPrice(stats.revenue)}</p>
                </div>
                <div className="stat-card border-l-4 border-[var(--accent-primary)]">
                    <p className="text-xs font-bold text-[var(--accent-primary)]/70 uppercase tracking-wider mb-1">Pendente (R$)</p>
                    <p className="text-xl font-black text-[var(--accent-primary)]">{formatPrice(stats.pendingValue)}</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px] relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none z-10">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-premium pl-12"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input-premium w-auto min-w-[150px] cursor-pointer"
                    >
                        <option value="">Status</option>
                        <option value="PENDING">Pendente</option>
                        <option value="APPROVED">Aprovado</option>
                        <option value="EXPIRED">Expirado</option>
                        <option value="REFUNDED">Reembolsado</option>
                    </select>
                    <select
                        value={productFilter}
                        onChange={(e) => setProductFilter(e.target.value)}
                        className="input-premium w-auto min-w-[180px] cursor-pointer"
                    >
                        <option value="">Produto</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                    </select>
                    <Button variant="primary" icon={<Filter size={18} />} onClick={applyFilters}>
                        Filtrar
                    </Button>
                </div>
            </Card>

            {/* Orders Table */}
            <Card padding="none">
                {filteredOrders.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <ShoppingCart size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Nenhuma venda encontrada</h3>
                        <p className="text-[var(--text-secondary)]">As vendas aparecerão aqui conforme forem realizadas</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Produto</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                    <th>Data</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="animate-fade-in">
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--border-color)] flex items-center justify-center">
                                                    <span className="font-semibold text-[var(--text-secondary)]">
                                                        {order.customer_name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-[var(--text-primary)]">{order.customer_name}</p>
                                                    <p className="text-sm text-[var(--text-secondary)]">{order.customer_email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <p className="font-medium text-[var(--text-primary)]">{order.product?.name || '-'}</p>
                                        </td>
                                        <td>
                                            <p className="font-bold text-[var(--text-primary)]">{formatPrice(order.amount)}</p>
                                        </td>
                                        <td>
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
                                        </td>
                                        <td>
                                            <p className="text-sm text-[var(--text-secondary)]">{formatDateTime(order.created_at)}</p>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                                                title="Ver detalhes"
                                            >
                                                <Eye size={18} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
