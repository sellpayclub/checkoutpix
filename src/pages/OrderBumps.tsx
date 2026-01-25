import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Gift, Sparkles } from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';
import { getOrderBumps, deleteOrderBump } from '../lib/supabase';
import { formatPrice } from '../lib/openpix';
import type { OrderBump } from '../types';

export function OrderBumps() {
    const [orderBumps, setOrderBumps] = useState<OrderBump[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadOrderBumps();
    }, []);

    async function loadOrderBumps() {
        try {
            const data = await getOrderBumps();
            setOrderBumps(data || []);
        } catch (error) {
            console.error('Error loading order bumps:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir este order bump?')) return;

        try {
            await deleteOrderBump(id);
            setOrderBumps(orderBumps.filter(ob => ob.id !== id));
        } catch (error) {
            console.error('Error deleting order bump:', error);
            alert('Erro ao excluir order bump');
        }
    }

    if (isLoading) {
        return (
            <div className="p-8 gradient-mesh min-h-screen animate-pulse">
                <div className="h-12 bg-white/5 rounded-xl w-48 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 bg-white/5 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 gradient-mesh min-h-screen pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-10 relative">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight italic uppercase">
                        ORDER<span className="text-[var(--accent-primary)]">BUMPS</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1 font-medium italic">Maximização de ticket médio por transação</p>
                </div>
                <Button
                    icon={<Plus size={18} />}
                    onClick={() => navigate('/order-bumps/novo')}
                    className="relative z-10"
                >
                    NOVO ORDER BUMP
                </Button>
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--accent-primary)] opacity-[0.03] blur-[100px] rounded-full" />
            </div>

            {/* Order Bumps Grid */}
            {orderBumps.length === 0 ? (
                <Card className="text-center py-20 bg-white/5 border-dashed">
                    <div className="w-20 h-20 rounded-full bg-[var(--accent-glow)] flex items-center justify-center mx-auto mb-6 text-[var(--accent-primary)]">
                        <Gift size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2 italic tracking-tighter uppercase">Potencialize suas Vendas</h3>
                    <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto font-medium">
                        Adicione ofertas irresistíveis na página de pagamento e veja seu lucro disparar.
                    </p>
                    <Button icon={<Plus size={18} />} onClick={() => navigate('/order-bumps/novo')}>
                        CRIAR PRIMEIRO BUMP
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {orderBumps.map((bump) => (
                        <Card key={bump.id} className="overflow-hidden group hover:scale-[1.02] transition-transform duration-500" padding="none">
                            {/* Visual Preview Section */}
                            <div
                                className="h-40 relative group/preview overflow-hidden"
                                style={{ backgroundColor: bump.box_color }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-transparent" />
                                <div className="p-6 relative">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles size={16} style={{ color: bump.text_color }} className="opacity-80" />
                                        <p className="font-black text-xs uppercase tracking-[0.2em]" style={{ color: bump.text_color }}>PREVIEW CHECKOUT</p>
                                    </div>
                                    <p className="font-black text-xl italic leading-tight" style={{ color: bump.text_color }}>
                                        {bump.title}
                                    </p>
                                    {bump.description && (
                                        <p className="text-sm mt-3 line-clamp-2 font-medium opacity-80" style={{ color: bump.text_color }}>
                                            {bump.description}
                                        </p>
                                    )}
                                </div>
                                <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mb-16 blur-2xl group-hover/preview:scale-125 transition-transform duration-1000" />
                            </div>

                            {/* Info Section */}
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-[var(--text-primary)] italic uppercase tracking-tighter">{bump.name}</h3>
                                    </div>
                                    <Badge variant={bump.is_active ? 'success' : 'default'} dot>
                                        {bump.is_active ? 'OPERACIONAL' : 'DESATIVADO'}
                                    </Badge>
                                </div>

                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-[var(--accent-primary)] font-black text-3xl tracking-tighter">{formatPrice(bump.price)}</span>
                                    <span className="text-[var(--text-tertiary)] text-xs font-bold uppercase italic">/ adicional</span>
                                </div>

                                {/* Actions Header */}
                                <div className="flex gap-3 pt-4 border-t border-[var(--border-subtle)]">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="flex-1 font-bold italic"
                                        icon={<Pencil size={14} />}
                                        onClick={() => navigate(`/order-bumps/${bump.id}`)}
                                    >
                                        EDITAR
                                    </Button>
                                    <button
                                        onClick={() => handleDelete(bump.id)}
                                        className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all group/del"
                                        title="Excluir Order Bump"
                                    >
                                        <Trash2 size={18} className="group-hover/del:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
