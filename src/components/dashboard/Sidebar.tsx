import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Gift,
    Facebook,
    Settings,
    ChevronLeft,
    ChevronRight,
    Zap,
    Wallet,
    Moon,
    Sun,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/produtos', icon: Package, label: 'Produtos' },
    { path: '/vendas', icon: ShoppingCart, label: 'Vendas' },
    { path: '/order-bumps', icon: Gift, label: 'Order Bumps' },
    { path: '/financeiro', icon: Wallet, label: 'Financeiro' },
    { path: '/pixels', icon: Facebook, label: 'Pixels' },
    { path: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const location = useLocation();
    const { toggleTheme, isDark } = useTheme();

    return (
        <aside
            className={`fixed left-0 top-0 h-full sidebar-premium z-40 transition-all duration-500 ease-in-out ${isCollapsed ? 'w-20' : 'w-72'
                }`}
        >
            {/* Logo */}
            <div className="h-24 flex items-center justify-between px-6">
                <div className={`flex items-center gap-4 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center relative group">
                        <div className="absolute inset-0 bg-[var(--accent-primary)] opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />
                        <div className="relative w-full h-full gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Zap size={24} className="text-white" />
                        </div>
                    </div>
                    {!isCollapsed && (
                        <div className="animate-fade-in">
                            <span className="font-extrabold text-2xl tracking-tighter italic logo-text">SELL<span className="text-[var(--accent-primary)]">PAY</span></span>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="mt-8 px-4">
                <p className={`text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 ${isCollapsed ? 'text-center' : 'px-4'}`}>
                    {isCollapsed ? '•••' : 'Main Interface'}
                </p>
                <ul className="space-y-2">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    className={`sidebar-item group ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center p-3' : ''}`}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <div className={`relative ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>
                                        <item.icon
                                            size={20}
                                            className="flex-shrink-0"
                                        />
                                        {isActive && (
                                            <div className="absolute inset-0 bg-current opacity-20 blur-md" />
                                        )}
                                    </div>
                                    {!isCollapsed && (
                                        <span className="font-bold text-sm tracking-tight">{item.label}</span>
                                    )}
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Bottom Actions Container */}
            <div className="absolute bottom-6 left-0 right-0 px-4 space-y-4">

                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:border-[var(--accent-primary)] transition-all group ${isCollapsed ? 'justify-center p-3' : ''}`}
                >
                    {isDark ? (
                        <Moon size={20} className="text-[var(--accent-primary)] group-hover:rotate-12 transition-transform" />
                    ) : (
                        <Sun size={20} className="text-amber-500 group-hover:rotate-45 transition-transform" />
                    )}
                    {!isCollapsed && (
                        <div className="text-left flex-1 animate-fade-in">
                            <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tighter">
                                {isDark ? 'DARK CORE' : 'LIGHT MOD'}
                            </p>
                            <p className="text-[10px] text-[var(--text-tertiary)] font-bold">CLICK TO SWITCH</p>
                        </div>
                    )}
                </button>
            </div>

            {/* Toggle Button (Floating) */}
            <button
                onClick={onToggle}
                className="absolute -right-4 top-24 w-8 h-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl flex items-center justify-center hover:border-[var(--accent-primary)] hover:scale-110 transition-all z-50 group"
            >
                {isCollapsed ? (
                    <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)]" />
                ) : (
                    <ChevronLeft size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)]" />
                )}
            </button>
        </aside>
    );
}
