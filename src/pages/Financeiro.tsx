import { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { Button, Card, Badge, Input } from '../components/ui';
import { getCompanyInfo, requestWithdraw, formatPrice, parsePriceToCents } from '../lib/openpix';
import type { WooviCompany } from '../lib/openpix';

export function Financeiro() {
    const [company, setCompany] = useState<WooviCompany | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Withdraw state
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawResult, setWithdrawResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const data = await getCompanyInfo();
            setCompany(data);
        } catch (error) {
            console.error('Error loading financial data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleRefresh() {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
    }

    async function handleWithdraw() {
        if (!withdrawAmount || !company) return;

        const amountInCents = parsePriceToCents(withdrawAmount);
        if (amountInCents <= 0) {
            setWithdrawResult({ success: false, message: 'Valor inválido' });
            return;
        }
        if (amountInCents > company.withdrawBalance) {
            setWithdrawResult({ success: false, message: 'Saldo insuficiente para saque' });
            return;
        }

        setIsWithdrawing(true);
        try {
            // Using 'default' as account ID - in production, you'd get the actual account ID
            const result = await requestWithdraw('default', amountInCents);
            setWithdrawResult(result);
            if (result.success) {
                setWithdrawAmount('');
                // Refresh balance after withdraw
                await loadData();
            }
        } catch (error) {
            setWithdrawResult({ success: false, message: 'Erro ao processar saque' });
        } finally {
            setIsWithdrawing(false);
        }
    }

    if (isLoading) {
        return (
            <div className="p-8 gradient-mesh min-h-screen animate-pulse">
                <div className="h-12 bg-white rounded-xl w-48 mb-8 shadow-sm" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="h-48 bg-white rounded-2xl shadow-sm" />
                    <div className="h-48 bg-white rounded-2xl shadow-sm" />
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
                        FINAN<span className="text-[var(--accent-primary)]">CEIRO</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1 font-medium">Gestão de ativos e retiradas</p>
                </div>
                <Button
                    variant="secondary"
                    icon={<RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />}
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="relative z-10"
                >
                    Atualizar
                </Button>
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--accent-primary)] opacity-[0.03] blur-[100px] rounded-full" />
            </div>

            {!company ? (
                <Card className="text-center py-12">
                    <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Não foi possível carregar os dados</h3>
                    <p className="text-gray-500 mb-4">
                        Verifique se sua chave da API OpenPix/Woovi está configurada corretamente.
                    </p>
                    <Button variant="secondary" onClick={handleRefresh}>
                        Tentar novamente
                    </Button>
                </Card>
            ) : (
                <>
                    {/* Balance Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {/* Available Balance */}
                        <div className="stat-card relative overflow-hidden p-6 border-b-4 border-emerald-500 group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl gradient-success flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                        <Wallet size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-[var(--text-tertiary)] uppercase tracking-widest">Saldo Disponível</p>
                                        <p className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">
                                            {formatPrice(company.balance)}
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="success" dot className="bg-emerald-500/10 border border-emerald-500/20">Sincronizado</Badge>
                            </div>
                        </div>

                        {/* Withdrawable Balance */}
                        <div className="stat-card relative overflow-hidden p-6 border-b-4 border-blue-500 group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl gradient-blue flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <ArrowUpRight size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-[var(--text-tertiary)] uppercase tracking-widest">Liberado Saque</p>
                                        <p className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">
                                            {formatPrice(company.withdrawBalance)}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-blue-500/80 tracking-wide">
                                    Pronto para transferência bancária
                                </p>
                            </div>
                        </div>

                        {/* Account Info */}
                        <div className="stat-card relative overflow-hidden p-6 border-b-4 border-purple-500 group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl gradient-purple flex items-center justify-center shadow-lg shadow-purple-500/20">
                                        <DollarSign size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-[var(--text-tertiary)] uppercase tracking-widest">Conta Principal</p>
                                        <p className="text-xl font-black text-[var(--text-primary)] truncate italic">{company.name}</p>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-purple-500/80 uppercase tracking-widest">
                                    {company.taxID}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Withdraw Section */}
                    <Card className="border-[var(--accent-primary)]/20 shadow-xl shadow-[var(--accent-glow)]">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-glow)] flex items-center justify-center">
                                <ArrowDownLeft size={24} className="text-[var(--accent-primary)]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-[var(--text-primary)] italic uppercase tracking-tighter">Solicitar <span className="text-[var(--accent-primary)]">Saque</span></h2>
                                <p className="text-sm font-medium text-[var(--text-secondary)]">Transferência instantânea via Pix para sua conta</p>
                            </div>
                        </div>

                        {withdrawResult && (
                            <div className={`mb-8 p-5 rounded-2xl flex items-center gap-4 border ${withdrawResult.success
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                } animate-fade-in`}>
                                {withdrawResult.success ? (
                                    <CheckCircle size={22} />
                                ) : (
                                    <AlertCircle size={22} />
                                )}
                                <span className="font-bold">{withdrawResult.message}</span>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row items-end gap-5">
                            <div className="w-full md:max-w-md">
                                <Input
                                    label="Quanto deseja sacar?"
                                    placeholder="0,00"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    icon={<DollarSign size={20} />}
                                    className="text-2xl font-black"
                                />
                            </div>
                            <Button
                                onClick={handleWithdraw}
                                disabled={isWithdrawing || !withdrawAmount}
                                className="w-full md:w-auto h-[60px] px-10 text-lg"
                                icon={isWithdrawing ? undefined : <ArrowUpRight size={22} />}
                            >
                                {isWithdrawing ? 'PROCESSANDO...' : 'SOLICITAR RETIRADA'}
                            </Button>
                        </div>

                        <div className="mt-8 p-5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-2xl">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                    <AlertCircle size={20} className="flex-shrink-0" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">Protocolo de Segurança</p>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium leading-relaxed">
                                        Saques solicitados via Woovi são processados em conformidade com as normas do BACEN.
                                        O tempo médio de liquidação é de <span className="text-[var(--text-primary)] font-bold italic">1 dia útil</span>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
