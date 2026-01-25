import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Palette, Upload, Trash2 } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { getOrderBump, createOrderBump, updateOrderBump, getProducts, linkOrderBumpToProduct, uploadFile } from '../lib/supabase';
import { parsePriceToCents } from '../lib/openpix';

export function OrderBumpForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [buttonText, setButtonText] = useState('');
    const [boxColor, setBoxColor] = useState('#22c55e');
    const [textColor, setTextColor] = useState('#ffffff');
    const [isActive, setIsActive] = useState(true);

    // Image Upload
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // Products
    const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        setIsLoading(true);
        try {
            const productsData = await getProducts();
            setProducts(productsData || []);

            if (id) {
                const bump = await getOrderBump(id);
                if (bump) {
                    setName(bump.name);
                    setTitle(bump.title);
                    setDescription(bump.description || '');
                    setPrice((bump.price / 100).toFixed(2).replace('.', ','));
                    setButtonText(bump.button_text || '');
                    setBoxColor(bump.box_color);
                    setTextColor(bump.text_color);
                    setIsActive(bump.is_active);
                    setImageUrl(bump.image_url);
                    setImagePreview(bump.image_url);
                    // Note: Would need to query product_order_bumps to get linked products
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !title.trim() || !price) {
            alert('Preencha os campos obrigatórios');
            return;
        }

        setIsSaving(true);
        try {
            let uploadedImageUrl = imageUrl;
            if (imageFile) {
                uploadedImageUrl = await uploadFile('bumps', `${Date.now()}_${imageFile.name}`, imageFile);
            }

            const bumpData = {
                name,
                title,
                description: description || undefined,
                price: parsePriceToCents(price),
                button_text: buttonText || undefined,
                box_color: boxColor,
                text_color: textColor,
                is_active: isActive,
                image_url: uploadedImageUrl || undefined,
            };

            if (isEditing && id) {
                await updateOrderBump(id, bumpData);
            } else {
                const newBump = await createOrderBump(bumpData);
                // Link to selected products
                for (const productId of selectedProductIds) {
                    await linkOrderBumpToProduct(productId, newBump.id);
                }
            }

            navigate('/order-bumps');
        } catch (error) {
            console.error('Error saving order bump:', error);
            alert('Erro ao salvar order bump');
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="p-8 animate-pulse">
                <div className="h-8 bg-[var(--bg-tertiary)] rounded w-64 mb-8" />
                <div className="h-96 bg-[var(--bg-tertiary)] rounded-xl" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-3xl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/order-bumps')}
                    className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-sellpay-text">
                        {isEditing ? 'Editar Order Bump' : 'Novo Order Bump'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Configure uma oferta adicional para o checkout
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <Card>
                    <h2 className="text-lg font-semibold text-sellpay-text mb-4">Informações</h2>

                    <div className="space-y-4">
                        <Input
                            label="Nome interno"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Bonus E-book"
                            required
                        />

                        <Input
                            label="Título (exibido no checkout)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Adicione o E-book Bônus!"
                            required
                        />

                        <Input
                            label="Texto do Botão (Opcional)"
                            value={buttonText}
                            onChange={(e) => setButtonText(e.target.value)}
                            placeholder="Ex: Adicionar oferta"
                            className="bg-gray-50 bg-opacity-50"
                        />

                        <div>
                            <label className="block text-sm font-medium text-sellpay-text mb-1.5">
                                Descrição (opcional)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descreva brevemente a oferta..."
                                rows={2}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sellpay-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sellpay-primary/20 focus:border-sellpay-primary resize-none"
                            />
                        </div>

                        <Input
                            label="Preço (R$)"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="0,00"
                            required
                        />

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-sellpay-text mb-2">
                                Imagem do Produto (Opcional)
                            </label>
                            <div className="flex items-center justify-center w-full">
                                {imagePreview ? (
                                    <div className="relative group w-full h-48 rounded-xl overflow-hidden border-2 border-gray-200">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain bg-gray-50" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button
                                                type="button"
                                                variant="danger"
                                                size="sm"
                                                onClick={() => {
                                                    setImageFile(null);
                                                    setImagePreview(null);
                                                    setImageUrl(null);
                                                }}
                                                icon={<Trash2 size={16} />}
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 mb-4 text-gray-500" />
                                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                                            <p className="text-xs text-gray-500">PNG, JPG ou WEBP (Max. 2MB)</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setImageFile(file);
                                                    const url = URL.createObjectURL(file);
                                                    setImagePreview(url);
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="w-4 h-4 text-sellpay-primary rounded border-gray-300 focus:ring-sellpay-primary"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-sellpay-text">
                                Ativo
                            </label>
                        </div>
                    </div>
                </Card>

                {/* Appearance */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <Palette size={20} className="text-gray-400" />
                        <h2 className="text-lg font-semibold text-sellpay-text">Aparência</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-sellpay-text mb-1.5">
                                Cor do fundo
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={boxColor}
                                    onChange={(e) => setBoxColor(e.target.value)}
                                    className="w-10 h-10 rounded cursor-pointer"
                                />
                                <Input
                                    value={boxColor}
                                    onChange={(e) => setBoxColor(e.target.value)}
                                    className="flex-1"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-sellpay-text mb-1.5">
                                Cor do texto
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={textColor}
                                    onChange={(e) => setTextColor(e.target.value)}
                                    className="w-10 h-10 rounded cursor-pointer"
                                />
                                <Input
                                    value={textColor}
                                    onChange={(e) => setTextColor(e.target.value)}
                                    className="flex-1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div>
                        <label className="block text-sm font-medium text-sellpay-text mb-2">
                            Prévia
                        </label>
                        <div
                            className="p-4 rounded-xl"
                            style={{ backgroundColor: boxColor }}
                        >
                            <p className="font-bold text-sm mb-1" style={{ color: textColor }}>
                                {title || 'Título do Order Bump'}
                            </p>
                            <p className="text-sm opacity-90" style={{ color: textColor }}>
                                {description || 'Descrição da oferta aparece aqui...'}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Associated Products */}
                {!isEditing && products.length > 0 && (
                    <Card>
                        <h2 className="text-lg font-semibold text-sellpay-text mb-4">Exibir em quais produtos?</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Selecione os checkouts onde este order bump deve aparecer
                        </p>

                        <div className="space-y-2">
                            {products.map((product) => (
                                <label
                                    key={product.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedProductIds.includes(product.id)
                                        ? 'border-sellpay-primary bg-sellpay-primary/5'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedProductIds.includes(product.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedProductIds([...selectedProductIds, product.id]);
                                            } else {
                                                setSelectedProductIds(selectedProductIds.filter(id => id !== product.id));
                                            }
                                        }}
                                        className="w-4 h-4 text-sellpay-primary rounded border-gray-300 focus:ring-sellpay-primary"
                                    />
                                    <span className="font-medium text-sellpay-text">{product.name}</span>
                                </label>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    <Button type="button" variant="secondary" onClick={() => navigate('/order-bumps')}>
                        Cancelar
                    </Button>
                    <Button type="submit" isLoading={isSaving}>
                        {isEditing ? 'Salvar Alterações' : 'Criar Order Bump'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
