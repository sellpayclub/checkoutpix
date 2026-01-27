import { useState, useEffect } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Package, ArrowUpRight, Eye, Zap, Clock, Percent, Target, Star, Wallet, Repeat, Users, BarChart3, Globe } from 'lucide-react';
import { StatCard } from '../components/dashboard';
import { Card, Badge, Button } from '../components/ui';
import { getDashboardStats, getOrders, getProducts } from '../lib/supabase';
import { formatPrice } from '../lib/openpix';
import { formatDateTime, getStatusLabel } from '../lib/utils';
import type { Order, Product } from '../types';

interface ExtendedStats {
    totalOrders: number;
    approvedOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    pendingRevenue: number;
    conversionRate: number;
    totalVisits: number;
    orderBumpOrders: number;
    orderBumpRevenue: number;
    averageTicket: number;
    todayRevenue: number;
    activeSubscriptions: number;
    mrr: number;
    arr: number;
}

interface ProductSales {
    id: string;
    name: string;
    sales: number;
    revenue: number;
}

export function Dashboard() {
    const [stats, setStats] = useState<ExtendedStats>({
        totalOrders: 0,
        approvedOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        pendingRevenue: 0,
        conversionRate: 0,
        totalVisits: 0,
        orderBumpOrders: 0,
        orderBumpRevenue: 0,
        averageTicket: 0,
        todayRevenue: 0,
        activeSubscriptions: 0,
        mrr: 0,
        arr: 0,
    });
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [topProducts, setTopProducts] = useState<ProductSales[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null, label: string }>({
        start: new Date(new Date().setHours(0, 0, 0, 0)), // Today start
        end: new Date(new Date().setHours(23, 59, 59, 999)), // Today end
        label: 'Hoje'
    });

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000); // Real-time update check every 5s
        return () => clearInterval(interval);
    }, [dateRange]);

    function handleDateFilter(range: string) {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        switch (range) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                setDateRange({ start, end, label: 'Hoje' });
                break;
            case 'yesterday':
                start.setDate(start.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(end.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                setDateRange({ start, end, label: 'Ontem' });
                break;
            case 'last7':
                start.setDate(start.getDate() - 7);
                start.setHours(0, 0, 0, 0);
                setDateRange({ start, end: now, label: 'Últimos 7 dias' });
                break;
            case 'last30':
                start.setDate(start.getDate() - 30);
                start.setHours(0, 0, 0, 0);
                setDateRange({ start, end: now, label: 'Últimos 30 dias' });
                break;
            case 'thisMonth':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                setDateRange({ start, end: now, label: 'Este Mês' });
                break;
        }
    }

    async function loadData() {
        try {
            // Convert to string for API if needed, or pass Date if API handles it. 
            // My API update expectation: getDashboardStats(startDate, endDate) taking strings (ISO)
            const startStr = dateRange.start?.toISOString();
            const endStr = dateRange.end?.toISOString();

            const [baseStats, ordersData, productsData] = await Promise.all([
                getDashboardStats(startStr, endStr), // Updated signature
                getOrders({ startDate: startStr, endDate: endStr }), // Updated to pass object
                getProducts(),
            ]);

            const orders = (ordersData as Order[]) || [];
            const products = (productsData as Product[]) || [];

            // Calculate extended stats
            const today = new Date().toDateString();
            const approvedOrders = orders.filter(o => o.status === 'APPROVED');
            const pendingOrders = orders.filter(o => o.status === 'PENDING');
            const bumpOrders = orders.filter(o => o.order_bump_id);
            const todayOrders = approvedOrders.filter(o => new Date(o.created_at).toDateString() === today);

            const pendingRevenue = pendingOrders.reduce((acc, o) => acc + o.amount, 0);
            const orderBumpRevenue = bumpOrders.filter(o => o.status === 'APPROVED').reduce((acc, order) => {
                // Use order bump amount if tracked, otherwise estimate
                return acc + (order.amount || 0);
            }, 0);
            const todayRevenue = todayOrders.reduce((acc, o) => acc + o.amount, 0);
            const averageTicket = approvedOrders.length > 0
                ? todayOrders.reduce((acc, o) => acc + o.amount, 0) / Math.max(todayOrders.length, 1)
                : 0;

            // Calculate top products
            const productSalesMap: Record<string, ProductSales> = {};
            orders.forEach(order => {
                if (order.status === 'APPROVED' && order.product_id) {
                    if (!productSalesMap[order.product_id]) {
                        const product = products.find(p => p.id === order.product_id);
                        productSalesMap[order.product_id] = {
                            id: order.product_id,
                            name: product?.name || 'Produto',
                            sales: 0,
                            revenue: 0,
                        };
                    }
                    productSalesMap[order.product_id].sales++;
                    productSalesMap[order.product_id].revenue += order.amount;
                }
            });

            const sortedProducts = Object.values(productSalesMap)
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 5);

            // Calculate Recurring Stats
            const recurringOrders = approvedOrders.filter(o => o.plan?.is_recurring);
            const activeSubscriptions = recurringOrders.length;

            let mrr = 0;
            recurringOrders.forEach(order => {
                if (order.plan?.recurring_interval === 'monthly') {
                    mrr += order.amount;
                } else if (order.plan?.recurring_interval === 'yearly') {
                    mrr += order.amount / 12;
                }
            });
            const arr = mrr * 12;

            setStats({
                ...baseStats,
                pendingRevenue,
                orderBumpOrders: bumpOrders.length,
                orderBumpRevenue,
                averageTicket,
                todayRevenue,
                activeSubscriptions,
                mrr,
                arr,
            });
            setRecentOrders(orders.slice(0, 10));
            setTopProducts(sortedProducts);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="p-8 gradient-mesh min-h-screen">
                <div className="animate-pulse space-y-8">
                    <div className="h-12 bg-[var(--bg-card)] rounded-xl w-64 shadow-sm" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-36 bg-[var(--bg-card)] rounded-2xl shadow-sm" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 gradient-mesh min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 relative gap-4">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight italic">
                        DASH<span className="text-[var(--accent-primary)]">BOARD</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1 font-medium">Performance em tempo real</p>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <div className="relative">
                        <select
                            className="appearance-none bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl px-4 py-2 pr-8 focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer font-medium shadow-sm transition-all"
                            onChange={(e) => handleDateFilter(e.target.value)}
                            defaultValue="today"
                        >
                            <option value="today">Hoje</option>
                            <option value="yesterday">Ontem</option>
                            <option value="last7">Últimos 7 dias</option>
                            <option value="last30">Últimos 30 dias</option>
                            <option value="thisMonth">Este Mês</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-secondary)]">
                            <Clock size={14} />
                        </div>
                    </div>

                    <Badge variant="success" dot className="bg-[var(--accent-glow)] border border-[var(--accent-primary)]/20">
                        {dateRange.label}
                    </Badge>
                </div>
                {/* Decorative element */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--accent-primary)] opacity-[0.03] blur-[100px] rounded-full" />
            </div>

            {/* Stats Grid - Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <StatCard
                    title="Vendas Pagas"
                    value={formatPrice(stats.totalRevenue)}
                    subtitle={`${stats.approvedOrders} vendas`}
                    icon={<DollarSign size={24} />}
                    color="success"
                />
                <StatCard
                    title="Vendas Pendentes"
                    value={formatPrice(stats.pendingRevenue)}
                    subtitle={`${stats.pendingOrders} vendas`}
                    icon={<Clock size={24} />}
                    color="warning"
                />
                <StatCard
                    title="Taxa de Conversão"
                    value={`${stats.conversionRate.toFixed(1)}%`}
                    subtitle={`${stats.totalVisits} visitas no checkout`}
                    icon={<Percent size={24} />}
                    color="primary"
                />
            </div>

            {/* Stats Grid - Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <StatCard
                    title="Vendas com Order Bump"
                    value={formatPrice(stats.orderBumpRevenue)}
                    subtitle={`${stats.orderBumpOrders} vendas`}
                    icon={<Target size={24} />}
                    color="primary"
                />
                <StatCard
                    title="Ticket Médio"
                    value={formatPrice(stats.averageTicket)}
                    icon={<TrendingUp size={24} />}
                    color="primary"
                />
                <StatCard
                    title={`Receita (${dateRange.label})`}
                    value={formatPrice(stats.totalRevenue)}
                    icon={<Wallet size={24} />}
                    color="success"
                />
            </div>

            {/* Recurring Stats Grid */}
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                    <Repeat size={20} className="text-blue-500" />
                </div>
                Assinaturas & Recorrência
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <StatCard
                    title="Assinaturas Ativas"
                    value={stats.activeSubscriptions.toString()}
                    subtitle="Recorrentes ativos"
                    icon={<Users size={24} />}
                    color="primary"
                />
                <StatCard
                    title="MRR"
                    value={formatPrice(stats.mrr)}
                    subtitle="Receita Recorrente Mensal"
                    icon={<BarChart3 size={24} />}
                    color="primary"
                />
                <StatCard
                    title="ARR"
                    value={formatPrice(stats.arr)}
                    subtitle="Receita Recorrente Anual"
                    icon={<Globe size={24} />}
                    color="primary"
                />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                {/* Top Products */}
                <Card className="lg:col-span-1">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Star size={20} className="text-purple-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">Produtos Mais Vendidos</h2>
                            <p className="text-sm text-[var(--text-secondary)]">Top 5 em vendas</p>
                        </div>
                    </div>

                    {topProducts.length === 0 ? (
                        <div className="text-center py-8">
                            <Package size={32} className="mx-auto text-[var(--text-muted)] mb-2" />
                            <p className="text-[var(--text-secondary)] text-sm">Nenhuma venda ainda</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {topProducts.map((product, index) => (
                                <div key={product.id} className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${index === 0 ? 'bg-yellow-500' :
                                        index === 1 ? 'bg-zinc-400' :
                                            index === 2 ? 'bg-amber-600' : 'bg-zinc-500'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-[var(--text-primary)] truncate">{product.name}</p>
                                        <p className="text-sm text-[var(--text-secondary)]">{product.sales} vendas</p>
                                    </div>
                                    <p className="font-bold text-emerald-500">{formatPrice(product.revenue)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Recent Orders */}
                <Card padding="none" className="lg:col-span-2">
                    <div className="p-6 border-b border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <ShoppingCart size={20} className="text-emerald-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[var(--text-primary)]">Pedidos Recentes</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">Últimas 10 transações</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" icon={<ArrowUpRight size={16} />}>
                                Ver todas
                            </Button>
                        </div>
                    </div>

                    {recentOrders.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <Zap size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Nenhum pedido ainda</h3>
                            <p className="text-[var(--text-secondary)] max-w-sm mx-auto">
                                Crie um produto e compartilhe o link do checkout para começar a vender!
                            </p>
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
                                    {recentOrders.map((order) => (
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
                                                <button className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                                                    <Eye size={18} className="text-[var(--text-tertiary)]" />
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
        </div>
    );
}
