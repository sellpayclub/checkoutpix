import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Copy, ExternalLink, Package } from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';
import { getProducts, deleteProduct, createShortLink } from '../lib/supabase';
import { formatPrice } from '../lib/openpix';
import { copyToClipboard } from '../lib/utils';
import type { Product, ProductPlan } from '../types';

export function Produtos() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        try {
            const data = await getProducts();
            setProducts(data as Product[] || []);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;

        try {
            await deleteProduct(id);
            setProducts(products.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Erro ao excluir produto');
        }
    }


    async function handleCopyLink(productId: string, planId: string) {
        // Original Long URL
        const longUrl = `${window.location.origin}/checkout/${productId}/${planId}`;

        try {
            // Generate Short Link
            const slug = await createShortLink(longUrl);
            const shortUrl = `${window.location.origin}/c/${slug}`;

            const success = await copyToClipboard(shortUrl);
            if (success) {
                setCopiedId(planId);
                setTimeout(() => setCopiedId(null), 2000);
            }
        } catch (err) {
            console.error('Falha ao encurtar link, usando longo', err);
            // Fallback to long url
            const success = await copyToClipboard(longUrl);
            if (success) {
                setCopiedId(planId);
                setTimeout(() => setCopiedId(null), 2000);
            }
        }
    }

    if (isLoading) {
        return (
            <div className="p-8 gradient-mesh min-h-screen animate-pulse">
                <div className="h-12 bg-[var(--bg-card)] rounded-xl w-48 mb-8 shadow-sm" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-80 bg-[var(--bg-card)] rounded-2xl shadow-sm" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 gradient-mesh min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-10 relative">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight italic">
                        PRO<span className="text-[var(--accent-primary)]">DUTOS</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1 font-medium">Ecossistema de produtos digitais</p>
                </div>
                <Button icon={<Plus size={18} />} onClick={() => navigate('/produtos/novo')} className="relative z-10">
                    Novo Produto
                </Button>
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--accent-primary)] opacity-[0.03] blur-[100px] rounded-full" />
            </div>

            {/* Products Grid */}
            {products.length === 0 ? (
                <Card className="text-center py-20">
                    <div className="empty-state-icon mx-auto">
                        <Package size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Nenhum produto criado</h3>
                    <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                        Crie seu primeiro produto digital e comece a vender com checkout PIX transparente
                    </p>
                    <Button icon={<Plus size={18} />} onClick={() => navigate('/produtos/novo')}>
                        Criar Primeiro Produto
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                        <Card key={product.id} className="overflow-hidden group" padding="none" hover>
                            {/* Product Image */}
                            <div className="relative h-48 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-card)] overflow-hidden">
                                {product.image_url ? (
                                    <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package size={48} className="text-[var(--text-muted)]" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent opacity-60" />

                                {/* Quick Actions */}
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-[-10px] group-hover:translate-y-0">
                                    <button
                                        onClick={() => navigate(`/produtos/${product.id}`)}
                                        className="p-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="p-2.5 bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl text-red-500 hover:bg-red-500/30 transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                {/* Plans Count Badge */}
                                <div className="absolute bottom-4 left-4">
                                    <Badge variant="success" dot className="bg-[var(--accent-glow)] border border-[var(--accent-primary)]/20 shadow-lg">
                                        {product.product_plans?.length || 0} ATIVO(S)
                                    </Badge>
                                </div>
                            </div>

                            {/* Product Info */}
                            <div className="p-6">
                                <h3 className="font-black text-xl text-[var(--text-primary)] mb-1 line-clamp-1 italic tracking-tight uppercase">{product.name}</h3>
                                {product.description && (
                                    <p className="text-sm text-[var(--text-secondary)] mb-6 line-clamp-2">{product.description}</p>
                                )}

                                {/* Plans */}
                                <div className="space-y-3">
                                    {product.product_plans?.slice(0, 2).map((plan: ProductPlan) => (
                                        <div
                                            key={plan.id}
                                            className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] rounded-2xl border border-transparent hover:border-[var(--border-subtle)] transition-all group/plan"
                                        >
                                            <div>
                                                <p className="font-bold text-[var(--text-primary)] text-sm">{plan.name}</p>
                                                <p className="font-black text-[var(--accent-primary)]">{formatPrice(plan.price)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleCopyLink(product.id, plan.id)}
                                                    className={`p-2.5 rounded-xl transition-all ${copiedId === plan.id
                                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]'
                                                        }`}
                                                    title="Copiar link"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <a
                                                    href={`/checkout/${product.id}/${plan.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2.5 bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] rounded-xl transition-all"
                                                    title="Abrir checkout"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                    {product.product_plans && product.product_plans.length > 2 && (
                                        <p className="text-xs font-bold text-[var(--text-tertiary)] text-center tracking-widest mt-2">
                                            +{product.product_plans.length - 2} OUTROS PLANOS
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
