import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, Link as LinkIcon, Package, DollarSign, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import {
    getProduct,
    createProduct,
    updateProduct,
    createProductPlan,
    upsertDeliverable,
    uploadFile,
    getOrderBumps,
} from '../lib/supabase';
import { parsePriceToCents } from '../lib/openpix';

interface PlanForm {
    id?: string;
    name: string;
    price: string;
    isRecurring: boolean;
    recurringInterval: 'monthly' | 'yearly' | null;
}

export function ProdutoForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [plans, setPlans] = useState<PlanForm[]>([
        { name: 'Plano Único', price: '', isRecurring: false, recurringInterval: null }
    ]);
    const [deliverableType, setDeliverableType] = useState<'file' | 'redirect'>('redirect');
    const [deliverableFile, setDeliverableFile] = useState<File | null>(null);
    const [redirectUrl, setRedirectUrl] = useState('');

    // Order bumps
    const [allOrderBumps, setAllOrderBumps] = useState<{ id: string; name: string }[]>([]);
    const [selectedBumpIds, setSelectedBumpIds] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        setIsLoading(true);
        try {
            const bumps = await getOrderBumps();
            setAllOrderBumps(bumps || []);

            if (id) {
                const product = await getProduct(id);
                if (product) {
                    setName(product.name);
                    setDescription(product.description || '');
                    setImagePreview(product.image_url);
                    setCoverPreview(product.cover_image_url);

                    if (product.product_plans?.length) {
                        setPlans(product.product_plans.map((p) => ({
                            id: p.id,
                            name: p.name,
                            price: (p.price / 100).toFixed(2).replace('.', ','),
                            isRecurring: p.is_recurring,
                            recurringInterval: p.recurring_interval,
                        })));
                    }

                    if (product.product_deliverables?.length) {
                        const deliv = product.product_deliverables[0];
                        setDeliverableType(deliv.type);
                        if (deliv.redirect_url) setRedirectUrl(deliv.redirect_url);
                    }

                    if (product.order_bump_ids) {
                        setSelectedBumpIds(product.order_bump_ids);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    }

    function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    }

    function handleDeliverableChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setDeliverableFile(file);
        }
    }

    function addPlan() {
        setPlans([...plans, { name: '', price: '', isRecurring: false, recurringInterval: null }]);
    }

    function removePlan(index: number) {
        setPlans(plans.filter((_, i) => i !== index));
    }

    function updatePlan(index: number, updates: Partial<PlanForm>) {
        const newPlans = [...plans];
        newPlans[index] = { ...newPlans[index], ...updates };
        setPlans(newPlans);
    }

    function toggleBump(bumpId: string) {
        setSelectedBumpIds(prev =>
            prev.includes(bumpId)
                ? prev.filter(tid => tid !== bumpId)
                : [...prev, bumpId]
        );
    }

    async function handleSubmit() {
        if (!name.trim()) return alert('Nome é obrigatório');
        if (plans.length === 0) return alert('Adicione pelo menos um plano');
        if (plans.some(p => !p.name || !p.price)) return alert('Preencha todos os planos');

        setIsSaving(true);
        try {
            let productId = id;
            let imageUrl = imagePreview;
            let coverUrl = coverPreview;

            if (imageFile) {
                imageUrl = await uploadFile('products', `${Date.now()}_${imageFile.name}`, imageFile);
            }

            if (coverFile) {
                coverUrl = await uploadFile('covers', `cover_${Date.now()}_${coverFile.name}`, coverFile);
            }

            if (isEditing && id) {
                await updateProduct(id, {
                    name,
                    description,
                    image_url: imageUrl || undefined,
                    cover_image_url: coverUrl || undefined,
                    order_bump_ids: selectedBumpIds,
                    product_plans: plans.map(p => ({
                        id: p.id || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                        product_id: id,
                        name: p.name,
                        price: parsePriceToCents(p.price),
                        is_recurring: p.isRecurring,
                        recurring_interval: p.recurringInterval,
                        is_active: true
                    }))
                });
            } else {
                const product = await createProduct({
                    name,
                    description,
                    image_url: imageUrl || undefined,
                    cover_image_url: coverUrl || undefined,
                    order_bump_ids: selectedBumpIds
                });
                productId = product.id;

                // Save plans for new product
                for (const plan of plans) {
                    await createProductPlan({
                        product_id: productId,
                        name: plan.name,
                        price: parsePriceToCents(plan.price),
                        is_recurring: plan.isRecurring,
                        recurring_interval: plan.recurringInterval,
                    });
                }
            }

            if (deliverableType === 'redirect' && redirectUrl) {
                await upsertDeliverable({
                    product_id: productId!,
                    type: 'redirect',
                    redirect_url: redirectUrl,
                });
            } else if (deliverableType === 'file' && deliverableFile) {
                const fileUrl = await uploadFile('deliverables', `${Date.now()}_${deliverableFile.name}`, deliverableFile);
                await upsertDeliverable({
                    product_id: productId!,
                    type: 'file',
                    file_url: fileUrl,
                });
            }

            navigate('/produtos');
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Erro ao salvar produto');
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="p-8 gradient-mesh min-h-screen animate-pulse">
                <div className="h-12 bg-white/5 rounded-xl w-48 mb-8" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-[600px] bg-white/5 rounded-2xl" />
                    <div className="h-[400px] bg-white/5 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 gradient-mesh min-h-screen pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-10 relative">
                <div className="flex items-center gap-6 relative z-10">
                    <button
                        onClick={() => navigate('/produtos')}
                        className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-all shadow-lg"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight italic uppercase">
                            {isEditing ? 'EDITAR' : 'NOVO'} <span className="text-[var(--accent-primary)]">PRODUTO</span>
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-1 font-medium italic">Configuração de oferta e entrega</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/produtos')}
                        disabled={isSaving}
                        className="font-bold opacity-60 hover:opacity-100"
                    >
                        CANCELAR
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        isLoading={isSaving}
                        className="px-10 h-[56px] text-lg font-black italic tracking-wider shadow-emerald-500/20"
                    >
                        {isEditing ? 'SALVAR ALTERAÇÕES' : 'PUBLICAR PRODUTO'}
                    </Button>
                </div>
                <div className="absolute -top-10 left-20 w-40 h-40 bg-[var(--accent-primary)] opacity-[0.03] blur-[100px] rounded-full" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Main Content */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Basic Info */}
                    <Card className="relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)]">
                                <Package size={20} />
                            </div>
                            <h2 className="text-xl font-black text-[var(--text-primary)] italic uppercase tracking-tighter">Informações <span className="text-[var(--accent-primary)]">Gerais</span></h2>
                        </div>

                        <div className="space-y-6">
                            <Input
                                label="NOME DO PRODUTO"
                                placeholder="Ex: Curso de Marketing Digital 2.0"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="text-lg font-bold"
                            />
                            <div className="w-full">
                                <label className="block text-xs font-black text-[var(--text-primary)] mb-2 uppercase tracking-widest opacity-70">
                                    DESCRIÇÃO DA OFERTA
                                </label>
                                <textarea
                                    className="input-premium min-h-[140px] resize-none"
                                    placeholder="Destaque os principais benefícios do seu produto..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Plans and Pricing */}
                    <Card>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                    <DollarSign size={20} />
                                </div>
                                <h2 className="text-xl font-black text-[var(--text-primary)] italic uppercase tracking-tighter">Planos & <span className="text-amber-500">Preços</span></h2>
                            </div>
                            <Button type="button" variant="secondary" size="sm" icon={<Plus size={16} />} onClick={addPlan}>
                                NOVO PLANO
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {plans.map((plan, index) => (
                                <div key={index} className="flex flex-col md:flex-row items-end gap-4 p-6 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-subtle)] relative group">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 w-full">
                                        <div className="md:col-span-5">
                                            <Input
                                                label="NOME DO PLANO"
                                                value={plan.name}
                                                onChange={(e) => updatePlan(index, { name: e.target.value })}
                                                placeholder="Ex: Mensal"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <Input
                                                label="PREÇO (R$)"
                                                value={plan.price}
                                                onChange={(e) => updatePlan(index, { price: e.target.value })}
                                                placeholder="97,00"
                                            />
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-black text-[var(--text-primary)] mb-2 uppercase tracking-widest opacity-70">RECORRÊNCIA</label>
                                            <select
                                                value={plan.isRecurring ? plan.recurringInterval || 'monthly' : 'once'}
                                                onChange={(e) => {
                                                    if (e.target.value === 'once') {
                                                        updatePlan(index, { isRecurring: false, recurringInterval: null });
                                                    } else {
                                                        updatePlan(index, {
                                                            isRecurring: true,
                                                            recurringInterval: e.target.value as 'monthly' | 'yearly'
                                                        });
                                                    }
                                                }}
                                                className="input-premium py-[15px]"
                                            >
                                                <option value="once">PAGAMENTO ÚNICO</option>
                                                <option value="monthly">MENSAL</option>
                                                <option value="yearly">ANUAL</option>
                                            </select>
                                        </div>
                                    </div>
                                    {plans.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removePlan(index)}
                                            className="p-3.5 text-red-500 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all mb-0.5"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Order Bumps */}
                    {allOrderBumps.length > 0 && (
                        <Card>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                    <Sparkles size={20} />
                                </div>
                                <h2 className="text-xl font-black text-[var(--text-primary)] italic uppercase tracking-tighter">Venda <span className="text-purple-500">Extra</span> (Bump)</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {allOrderBumps.map((bump) => (
                                    <button
                                        key={bump.id}
                                        type="button"
                                        onClick={() => toggleBump(bump.id)}
                                        className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${selectedBumpIds.includes(bump.id)
                                            ? 'border-[var(--accent-primary)] bg-[var(--accent-glow)]'
                                            : 'border-[var(--border-color)] bg-[var(--bg-tertiary)] opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedBumpIds.includes(bump.id) ? 'bg-[var(--accent-primary)] border-transparent text-white' : 'border-[var(--border-color)]'}`}>
                                            {selectedBumpIds.includes(bump.id) && <CheckCircle2 size={16} />}
                                        </div>
                                        <span className="font-bold text-[var(--text-primary)] uppercase">{bump.name}</span>
                                    </button>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar Controls */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Media Assets */}
                    <Card>
                        <h2 className="text-sm font-black text-[var(--text-primary)] italic uppercase tracking-widest mb-6 pb-4 border-b border-[var(--border-color)]">IDENTIDADE VISUAL</h2>

                        <div className="space-y-8">
                            {/* Thumbnail */}
                            <div>
                                <label className="block text-xs font-black text-[var(--text-primary)] mb-3 opacity-70 uppercase tracking-widest">MINIATURA (LISTAGEM)</label>
                                <div className="space-y-4">
                                    <label className="relative block h-40 border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-tertiary)]/50 hover:bg-[var(--bg-tertiary)] hover:border-[var(--accent-primary)] transition-all cursor-pointer overflow-hidden group">
                                        {imagePreview ? (
                                            <>
                                                <img src={imagePreview} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold shadow-xl">ALTERAR MÍDIA</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center gap-3">
                                                <Upload size={32} className="text-[var(--text-muted)]" />
                                                <span className="text-xs font-bold text-[var(--text-muted)] tracking-widest">SELECIONAR IMAGEM</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            {/* Cover */}
                            <div>
                                <label className="block text-xs font-black text-[var(--text-primary)] mb-3 opacity-70 uppercase tracking-widest">CAPA (CHECKOUT)</label>
                                <label className="relative block h-28 border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-tertiary)]/50 hover:bg-[var(--bg-tertiary)] hover:border-[var(--accent-primary)] transition-all cursor-pointer overflow-hidden group">
                                    {coverPreview ? (
                                        <>
                                            <img src={coverPreview} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold shadow-xl flex items-center gap-2">
                                                    <Trash2 size={14} /> ALTERAR
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center gap-2">
                                            <Upload size={24} className="text-[var(--text-muted)]" />
                                            <span className="text-xs font-bold text-[var(--text-muted)] tracking-widest">SUBIR BANNER</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                                </label>
                            </div>
                        </div>
                    </Card>

                    {/* Delivery */}
                    <Card>
                        <h2 className="text-sm font-black text-[var(--text-primary)] italic uppercase tracking-widest mb-6 pb-4 border-b border-[var(--border-color)]">ENTREGA PÓS-PAGO</h2>

                        <div className="flex gap-2 p-1 bg-[var(--bg-tertiary)] rounded-2xl mb-6">
                            <button
                                type="button"
                                onClick={() => setDeliverableType('redirect')}
                                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${deliverableType === 'redirect' ? 'bg-[var(--accent-primary)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                            >
                                URL REDIRECT
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliverableType('file')}
                                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${deliverableType === 'file' ? 'bg-[var(--accent-primary)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                            >
                                ARQUIVO PDF
                            </button>
                        </div>

                        {deliverableType === 'redirect' ? (
                            <Input
                                label="PÁGINA DE OBRIGADO"
                                value={redirectUrl}
                                onChange={(e) => setRedirectUrl(e.target.value)}
                                placeholder="https://..."
                                icon={<LinkIcon size={18} />}
                            />
                        ) : (
                            <label className="block border-2 border-dashed border-[var(--border-color)] rounded-2xl p-6 text-center cursor-pointer hover:border-[var(--accent-primary)] transition-all bg-[var(--bg-tertiary)]/30 group">
                                <Upload size={24} className="mx-auto text-[var(--text-muted)] mb-3 group-hover:text-[var(--accent-primary)] transition-colors" />
                                <p className="text-xs font-black text-[var(--text-secondary)] uppercase truncate">
                                    {deliverableFile ? deliverableFile.name : 'SELECIONAR ARQUIVO'}
                                </p>
                                <input type="file" onChange={handleDeliverableChange} className="hidden" />
                            </label>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}

