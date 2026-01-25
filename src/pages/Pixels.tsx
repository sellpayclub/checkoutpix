import { useState, useEffect } from 'react';
import { Plus, Trash2, Facebook, Check, AlertCircle } from 'lucide-react';
import { Button, Card, Input, Badge } from '../components/ui';
import { getPixels, createPixel, updatePixel, deletePixel } from '../lib/supabase';
import type { FacebookPixel } from '../types';

const AVAILABLE_EVENTS = ['PageView', 'InitiateCheckout', 'AddToCart', 'Purchase', 'Lead', 'CompleteRegistration'];

export function Pixels() {
    const [pixels, setPixels] = useState<FacebookPixel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newPixelId, setNewPixelId] = useState('');
    const [newPixelName, setNewPixelName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadPixels();
    }, []);

    async function loadPixels() {
        try {
            const data = await getPixels();
            setPixels(data || []);
        } catch (error) {
            console.error('Error loading pixels:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleAddPixel() {
        if (!newPixelId.trim()) {
            alert('Digite o ID do Pixel');
            return;
        }

        setIsAdding(true);
        try {
            const pixel = await createPixel({
                pixel_id: newPixelId.trim(),
                name: newPixelName.trim() || undefined,
                events: ['PageView', 'InitiateCheckout', 'Purchase'],
            });
            setPixels([pixel, ...pixels]);
            setNewPixelId('');
            setNewPixelName('');
        } catch (error) {
            console.error('Error adding pixel:', error);
            alert('Erro ao adicionar pixel');
        } finally {
            setIsAdding(false);
        }
    }

    async function handleToggleActive(pixel: FacebookPixel) {
        try {
            await updatePixel(pixel.id, { is_active: !pixel.is_active });
            setPixels(pixels.map(p =>
                p.id === pixel.id ? { ...p, is_active: !p.is_active } : p
            ));
        } catch (error) {
            console.error('Error updating pixel:', error);
        }
    }

    async function handleToggleEvent(pixel: FacebookPixel, event: string) {
        const newEvents = pixel.events.includes(event)
            ? pixel.events.filter(e => e !== event)
            : [...pixel.events, event];

        try {
            await updatePixel(pixel.id, { events: newEvents });
            setPixels(pixels.map(p =>
                p.id === pixel.id ? { ...p, events: newEvents } : p
            ));
        } catch (error) {
            console.error('Error updating pixel:', error);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja remover este pixel?')) return;

        try {
            await deletePixel(id);
            setPixels(pixels.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting pixel:', error);
            alert('Erro ao remover pixel');
        }
    }

    if (isLoading) {
        return (
            <div className="p-8 animate-pulse">
                <div className="h-8 bg-[var(--bg-tertiary)] rounded w-48 mb-8" />
                <div className="space-y-6">
                    <div className="h-32 bg-[var(--bg-tertiary)] rounded-xl" />
                    <div className="h-48 bg-[var(--bg-tertiary)] rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-sellpay-text">Facebook Pixels</h1>
                <p className="text-gray-500 mt-1">Gerencie seus pixels para rastreamento de conversões</p>
            </div>

            {/* Add Pixel */}
            <Card className="mb-6">
                <h2 className="text-lg font-semibold text-sellpay-text mb-4">Adicionar Pixel</h2>

                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <Input
                            placeholder="ID do Pixel (ex: 123456789012345)"
                            value={newPixelId}
                            onChange={(e) => setNewPixelId(e.target.value)}
                            icon={<Facebook size={18} />}
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <Input
                            placeholder="Nome (opcional)"
                            value={newPixelName}
                            onChange={(e) => setNewPixelName(e.target.value)}
                        />
                    </div>
                    <Button
                        icon={<Plus size={18} />}
                        onClick={handleAddPixel}
                        isLoading={isAdding}
                    >
                        Adicionar
                    </Button>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-start gap-3">
                    <AlertCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">
                        Você pode encontrar seu Pixel ID no Gerenciador de Eventos do Facebook Ads:
                        <br />
                        <strong>Gerenciador de Eventos → Fontes de dados → Seu Pixel → Configurações</strong>
                    </p>
                </div>
            </Card>

            {/* Pixels List */}
            {pixels.length === 0 ? (
                <Card className="text-center py-12">
                    <Facebook size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                    <p className="text-[var(--text-secondary)]">Nenhum pixel adicionado</p>
                    <p className="text-sm text-[var(--text-tertiary)] mt-1">Adicione seu primeiro pixel para rastrear conversões</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {pixels.map((pixel) => (
                        <Card key={pixel.id}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pixel.is_active ? 'bg-blue-100' : 'bg-gray-100'
                                        }`}>
                                        <Facebook size={20} className={pixel.is_active ? 'text-blue-600' : 'text-gray-400'} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sellpay-text">
                                            {pixel.name || `Pixel ${pixel.pixel_id.slice(-4)}`}
                                        </h3>
                                        <p className="text-sm text-gray-500 font-mono">{pixel.pixel_id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={pixel.is_active ? 'success' : 'default'}>
                                        {pixel.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                    <button
                                        onClick={() => handleToggleActive(pixel)}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${pixel.is_active ? 'bg-sellpay-primary' : 'bg-gray-200'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${pixel.is_active ? 'left-7' : 'left-1'
                                                }`}
                                        />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(pixel.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Events */}
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-2">Eventos ativos:</p>
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_EVENTS.map((event) => {
                                        const isEnabled = pixel.events.includes(event);
                                        return (
                                            <button
                                                key={event}
                                                onClick={() => handleToggleEvent(pixel, event)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${isEnabled
                                                    ? 'bg-sellpay-primary/10 text-sellpay-primary border border-sellpay-primary/20'
                                                    : 'bg-gray-100 text-gray-500 border border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                {isEnabled && <Check size={14} />}
                                                {event}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
