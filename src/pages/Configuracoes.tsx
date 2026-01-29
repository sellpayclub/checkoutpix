import React, { useState, useEffect } from 'react';
import { Save, Clock, Palette, Type, Upload, Image, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { getCheckoutSettings, updateCheckoutSettings, uploadFile } from '../lib/supabase';

export function Configuracoes() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Settings state
    const [timerEnabled, setTimerEnabled] = useState(true);
    const [timerText, setTimerText] = useState('Oferta por tempo limitado');
    const [timerDuration, setTimerDuration] = useState(10);
    const [primaryColor, setPrimaryColor] = useState('#059669');
    const [buttonText, setButtonText] = useState('FINALIZAR COMPRA');
    const [footerText, setFooterText] = useState('© 2026 SellPay. Todos os direitos reservados.');

    // New settings
    const [cpfEnabled, setCpfEnabled] = useState(false);
    const [orderBumpTitle, setOrderBumpTitle] = useState('Aproveite essa oferta especial!');
    const [orderBumpButtonText, setOrderBumpButtonText] = useState('Adicionar oferta');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookEvents, setWebhookEvents] = useState<string[]>(['sale_generated', 'sale_approved']);

    // Logo
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Cover Image
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const settings = await getCheckoutSettings();
            if (settings) {
                setTimerEnabled(settings.timer_enabled);
                setTimerText(settings.timer_text);
                setTimerDuration(Math.floor(settings.timer_duration / 60));
                setPrimaryColor(settings.primary_color);
                setButtonText(settings.button_text);
                setFooterText(settings.footer_text);
                setLogoUrl(settings.logo_url);
                setLogoPreview(settings.logo_url);
                setCoverUrl(settings.cover_image_url || null);
                setCoverPreview(settings.cover_image_url || null);
                setCpfEnabled(settings.cpf_enabled || false);
                setOrderBumpTitle(settings.order_bump_title || 'Aproveite essa oferta especial!');
                setOrderBumpButtonText(settings.order_bump_button_text || 'Adicionar oferta');
                setWebhookUrl(settings.webhook_url || '');
                setWebhookEvents(settings.webhook_events || ['sale_generated', 'sale_approved']);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    }

    function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    }

    function toggleWebhookEvent(event: string) {
        setWebhookEvents(prev =>
            prev.includes(event)
                ? prev.filter(e => e !== event)
                : [...prev, event]
        );
    }

    async function handleSave() {
        setIsSaving(true);
        try {
            let uploadedLogoUrl = logoUrl;
            let uploadedCoverUrl = coverUrl;

            if (logoFile) {
                uploadedLogoUrl = await uploadFile('logos', `logo_${Date.now()}.png`, logoFile);
            }

            if (coverFile) {
                uploadedCoverUrl = await uploadFile('covers', `cover_${Date.now()}.png`, coverFile);
            }

            await updateCheckoutSettings({
                timer_enabled: timerEnabled,
                timer_text: timerText,
                timer_duration: timerDuration * 60,
                primary_color: primaryColor,
                button_text: buttonText,
                footer_text: footerText,
                logo_url: uploadedLogoUrl || undefined,
                cover_image_url: uploadedCoverUrl || undefined,
                cpf_enabled: cpfEnabled,
                order_bump_title: orderBumpTitle,
                order_bump_button_text: orderBumpButtonText,
                webhook_url: webhookUrl,
                webhook_events: webhookEvents,
            });

            alert('Configurações salvas com sucesso!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Erro ao salvar configurações');
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="p-8 gradient-mesh min-h-screen animate-pulse">
                <div className="h-12 bg-white/5 rounded-xl w-48 mb-8" />
                <div className="max-w-4xl space-y-6">
                    <div className="h-48 bg-white/5 rounded-2xl" />
                    <div className="h-48 bg-white/5 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 gradient-mesh min-h-screen pb-20">
            <div className="max-w-4xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-10 relative">
                    <div className="relative z-10">
                        <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight italic uppercase">
                            CONFIGURA<span className="text-[var(--accent-primary)]">ÇÕES</span>
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-1 font-medium italic">Personalização global da experiência de checkout</p>
                    </div>
                    <Button
                        icon={<Save size={18} />}
                        onClick={handleSave}
                        isLoading={isSaving}
                        className="px-8 h-[52px] font-black italic tracking-wider shadow-lg relative z-10"
                    >
                        SALVAR ALTERAÇÕES
                    </Button>
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--accent-primary)] opacity-[0.03] blur-[100px] rounded-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Visual Section */}
                    <div className="md:col-span-12 lg:col-span-7 space-y-8">
                        {/* Branding */}
                        <Card className="relative overflow-hidden group">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)]">
                                    <ShieldCheck size={20} />
                                </div>
                                <h2 className="text-xl font-black text-[var(--text-primary)] italic uppercase tracking-tighter">Branding <span className="text-[var(--accent-primary)]">& Assets</span></h2>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="block text-xs font-black text-[var(--text-primary)] mb-4 opacity-70 uppercase tracking-widest">LOGOTIPO DA PLATAFORMA</label>
                                    <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-subtle)]">
                                        <div className="w-full md:w-32 h-20 bg-[var(--bg-primary)] rounded-xl flex items-center justify-center p-4 border border-[var(--border-color)]">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Logo" className="h-full object-contain" />
                                            ) : (
                                                <Upload size={24} className="text-[var(--text-muted)]" />
                                            )}
                                        </div>
                                        <label className="flex-1 cursor-pointer w-full">
                                            <div className="h-20 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-xl hover:border-[var(--accent-primary)] hover:bg-[var(--accent-glow)] transition-all">
                                                <Upload size={18} className="text-[var(--text-muted)] mb-1" />
                                                <span className="text-[var(--text-primary)] font-black text-xs italic tracking-wider">TROCAR LOGO</span>
                                            </div>
                                            <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-[var(--text-primary)] mb-4 opacity-70 uppercase tracking-widest">CAPA PADRÃO DO CHECKOUT</label>
                                    <div className="space-y-4">
                                        {coverPreview && (
                                            <div className="relative h-32 rounded-2xl overflow-hidden border border-[var(--border-color)]">
                                                <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                                                    <span className="bg-white text-black px-4 py-2 rounded-xl text-xs font-black italic">ALTERAR CAPA</span>
                                                </div>
                                            </div>
                                        )}
                                        <label className="block cursor-pointer">
                                            {!coverPreview && (
                                                <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-2xl hover:border-[var(--accent-primary)] hover:bg-[var(--accent-glow)] transition-all">
                                                    <Image size={24} className="text-[var(--text-muted)] mb-2" />
                                                    <span className="text-[var(--text-primary)] font-black text-xs italic tracking-wider">UPLOAD BANNER</span>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Components Config */}
                        <Card>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                    <Clock size={20} />
                                </div>
                                <h2 className="text-xl font-black text-[var(--text-primary)] italic uppercase tracking-tighter">Urgência <span className="text-amber-500">& Escassez</span></h2>
                            </div>

                            <div className="space-y-6">
                                <button
                                    onClick={() => setTimerEnabled(!timerEnabled)}
                                    className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${timerEnabled ? 'border-[var(--accent-primary)] bg-[var(--accent-glow)] shadow-md' : 'border-[var(--border-color)] bg-[var(--bg-tertiary)] opacity-60'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${timerEnabled ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'}`}>
                                            <Clock size={18} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tighter">Timer de Oferta</p>
                                            <p className="text-xs font-medium text-[var(--text-secondary)]">Contagem regressiva no topo da página</p>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full relative transition-all ${timerEnabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-primary)]'}`}>
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${timerEnabled ? 'right-1' : 'left-1'}`} />
                                    </div>
                                </button>

                                {timerEnabled && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-subtle)] animate-fade-in">
                                        <Input
                                            label="TEXTO DO TIMER"
                                            value={timerText}
                                            onChange={(e) => setTimerText(e.target.value)}
                                            placeholder="Oferta por tempo limitado"
                                        />
                                        <div>
                                            <label className="block text-xs font-black text-[var(--text-primary)] mb-2 uppercase tracking-widest opacity-70">DURAÇÃO (MINUTOS)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={60}
                                                value={timerDuration}
                                                onChange={(e) => setTimerDuration(parseInt(e.target.value) || 10)}
                                                className="input-premium"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Configurações Adicionais */}
                        <Card>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                    <ShieldCheck size={20} />
                                </div>
                                <h2 className="text-xl font-black text-[var(--text-primary)] italic uppercase tracking-tighter">Opções <span className="text-purple-500">Extras</span></h2>
                            </div>

                            <div className="space-y-6">
                                {/* CPF Toggle */}
                                <button
                                    onClick={() => setCpfEnabled(!cpfEnabled)}
                                    className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${cpfEnabled ? 'border-purple-500 bg-purple-500/10 shadow-md' : 'border-[var(--border-color)] bg-[var(--bg-tertiary)] opacity-60'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cpfEnabled ? 'bg-purple-500 text-white' : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'}`}>
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tighter">Solicitar CPF</p>
                                            <p className="text-xs font-medium text-[var(--text-secondary)]">Campo de CPF no checkout</p>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full relative transition-all ${cpfEnabled ? 'bg-purple-500' : 'bg-[var(--bg-primary)]'}`}>
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${cpfEnabled ? 'right-1' : 'left-1'}`} />
                                    </div>
                                </button>
                            </div>
                        </Card>

                        {/* Webhooks & Notifications */}
                        <Card>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <div className="w-5 h-5 relative">
                                        <div className="absolute inset-0 bg-current rounded-full opacity-20 animate-ping" />
                                        <div className="absolute inset-1 bg-current rounded-full" />
                                    </div>
                                </div>
                                <h2 className="text-xl font-black text-[var(--text-primary)] italic uppercase tracking-tighter">Webhooks <span className="text-indigo-500">& API</span></h2>
                            </div>

                            <div className="space-y-6">
                                <Input
                                    label="URL DO WEBHOOK"
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    placeholder="https://n8n.seusite.com/webhook/..."
                                    className="font-mono text-xs"
                                />

                                <div className="space-y-3">
                                    <label className="block text-xs font-black text-[var(--text-primary)] mb-2 opacity-70 uppercase tracking-widest">EVENTOS ATIVOS</label>

                                    <button
                                        onClick={() => toggleWebhookEvent('sale_generated')}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${webhookEvents.includes('sale_generated')
                                            ? 'border-indigo-500 bg-indigo-500/5'
                                            : 'border-[var(--border-color)] bg-[var(--bg-tertiary)] opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${webhookEvents.includes('sale_generated') ? 'bg-indigo-500 text-white' : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'}`}>
                                                <div className="w-2 h-2 bg-current rounded-full" />
                                            </div>
                                            <span className="font-bold text-sm text-[var(--text-primary)]">VENDA GERADA (PENDENTE)</span>
                                        </div>
                                        {webhookEvents.includes('sale_generated') && <CheckCircle2 size={16} className="text-indigo-500" />}
                                    </button>

                                    <button
                                        onClick={() => toggleWebhookEvent('sale_approved')}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${webhookEvents.includes('sale_approved')
                                            ? 'border-indigo-500 bg-indigo-500/5'
                                            : 'border-[var(--border-color)] bg-[var(--bg-tertiary)] opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${webhookEvents.includes('sale_approved') ? 'bg-indigo-500 text-white' : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'}`}>
                                                <div className="w-2 h-2 bg-current rounded-full" />
                                            </div>
                                            <span className="font-bold text-sm text-[var(--text-primary)]">VENDA APROVADA</span>
                                        </div>
                                        {webhookEvents.includes('sale_approved') && <CheckCircle2 size={16} className="text-indigo-500" />}
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Style Section */}
                    <div className="md:col-span-12 lg:col-span-5 space-y-8">
                        {/* Style Customization */}
                        <Card>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Palette size={20} />
                                </div>
                                <h2 className="text-xl font-black text-[var(--text-primary)] italic uppercase tracking-tighter">Estilo <span className="text-blue-500">& UI</span></h2>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="block text-xs font-black text-[var(--text-primary)] mb-4 opacity-70 uppercase tracking-widest">PALETA DE CORES (ACENTO)</label>
                                    <div className="flex items-center gap-4 p-4 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-subtle)]">
                                        <input
                                            type="color"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="w-14 h-14 rounded-xl cursor-pointer bg-transparent border-none"
                                        />
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-[var(--text-primary)] mb-1">{primaryColor.toUpperCase()}</p>
                                            <p className="text-xs font-medium text-[var(--text-tertiary)]">HEXADECIMAL</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-[var(--text-primary)] mb-4 opacity-70 uppercase tracking-widest">TEXTO DO BOTÃO DE COMPRA</label>
                                    <Input
                                        value={buttonText}
                                        onChange={(e) => setButtonText(e.target.value)}
                                        placeholder="FINALIZAR COMPRA"
                                        className="text-center font-black italic tracking-wider"
                                    />
                                </div>

                                <div className="pt-6 border-t border-[var(--border-subtle)]">
                                    <p className="block text-xs font-black text-[var(--text-primary)] mb-4 uppercase tracking-widest text-center">ORDER BUMP CONFIG</p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-2 uppercase">Título da Seção</label>
                                            <Input
                                                value={orderBumpTitle}
                                                onChange={(e) => setOrderBumpTitle(e.target.value)}
                                                placeholder="Aproveite essa oferta especial!"
                                                className="text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-2 uppercase">Texto do Botão</label>
                                            <Input
                                                value={orderBumpButtonText}
                                                onChange={(e) => setOrderBumpButtonText(e.target.value)}
                                                placeholder="Adicionar oferta"
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-[var(--text-primary)] mb-4 opacity-70 uppercase tracking-widest">PRÉVIA EM TEMPO REAL</label>
                                    <button
                                        className="w-full h-14 rounded-2xl text-white font-black italic tracking-widest shadow-xl transition-all active:scale-[0.98] group"
                                        style={{
                                            backgroundColor: primaryColor,
                                            boxShadow: `0 8px 24px ${primaryColor}40`
                                        }}
                                    >
                                        {buttonText.toUpperCase()}
                                    </button>
                                </div>
                            </div>
                        </Card>

                        {/* Global Footer */}
                        <Card>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center text-[var(--text-primary)]">
                                    <Type size={20} />
                                </div>
                                <h2 className="text-xl font-black text-[var(--text-primary)] italic uppercase tracking-tighter">Rodapé <span className="opacity-40">& Info</span></h2>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-[var(--text-primary)] mb-2 opacity-70 uppercase tracking-widest">COPYRIGHT / LEGAL</label>
                                    <textarea
                                        value={footerText}
                                        onChange={(e) => setFooterText(e.target.value)}
                                        placeholder="© 2026 SellPay. Todos os direitos reservados."
                                        className="input-premium h-24 resize-none text-[10px] font-mono leading-relaxed"
                                    />
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Páginas de Políticas Ativas</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Live Floating Preview */}
                <div className="mt-12">
                    <p className="text-xs font-black text-[var(--text-tertiary)] text-center uppercase tracking-[0.2em] mb-4">Vejamos como o cliente verá o topo do checkout</p>
                    {timerEnabled && (
                        <div className="relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                            <div
                                className="py-5 px-10 text-center text-white font-black italic rounded-3xl shadow-2xl relative transition-all transform hover:scale-[1.01]"
                                style={{
                                    backgroundColor: primaryColor,
                                    boxShadow: `0 10px 40px ${primaryColor}30`
                                }}
                            >
                                <div className="flex items-center justify-center gap-4">
                                    <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]" />
                                    <span className="tracking-[0.1em] uppercase text-sm md:text-base">{timerText}</span>
                                    <div className="bg-black/20 px-4 py-1.5 rounded-xl font-mono text-base md:text-xl border border-white/10">
                                        {String(timerDuration).padStart(2, '0')}:00
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
