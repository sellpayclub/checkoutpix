import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

// Hardcoded credentials as requested
const VALID_EMAIL = 'personaldann@gmail.com';
const VALID_PASS = 'Senha@123';

export function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        if (email === VALID_EMAIL && password === VALID_PASS) {
            login('valid_session');
            navigate('/');
        } else {
            setError('Credenciais inválidas. Tente novamente.');
        }

        setIsLoading(false);
    }

    return (
        <div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
            <Card className="max-w-md w-full animate-fade-in relative z-10 border-[var(--border-subtle)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent-primary)] to-emerald-400" />

                <div className="text-center mb-8 pt-4">
                    <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-4 from-[var(--accent-glow)] shadow-inner">
                        <Lock size={32} className="text-[var(--accent-primary)]" />
                    </div>
                    <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase italic">
                        Painel <span className="text-[var(--accent-primary)]">Admin</span>
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Acesso exclusivo para administradores</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <Input
                            label="EMAIL"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            icon={<Mail size={18} />}
                            className="bg-[var(--bg-tertiary)]"
                        />
                        <Input
                            label="SENHA"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={<Lock size={18} />}
                            className="bg-[var(--bg-tertiary)]"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm font-medium animate-shake">
                            <ShieldCheck size={16} />
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        isLoading={isLoading}
                        className="w-full h-12 text-lg font-bold shadow-lg shadow-emerald-500/20"
                        icon={<ArrowRight size={18} />}
                    >
                        ACESSAR SISTEMA
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] text-center">
                    <p className="text-xs text-[var(--text-tertiary)] font-mono">
                        SellPay Security System v1.0
                    </p>
                </div>
            </Card>
        </div>
    );
}
