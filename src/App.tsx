import { useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './components/dashboard';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Produtos } from './pages/Produtos';
import { ProdutoForm } from './pages/ProdutoForm';
import { Vendas } from './pages/Vendas';
import { OrderBumps } from './pages/OrderBumps';
import { OrderBumpForm } from './pages/OrderBumpForm';
import { Financeiro } from './pages/Financeiro';
import { Pixels } from './pages/Pixels';
import { Configuracoes } from './pages/Configuracoes';
import { Checkout } from './pages/Checkout';
import { Obrigado } from './pages/Obrigado';
import { ShortLinkRedirect } from './pages/ShortLinkRedirect';

// Dashboard Layout with Sidebar
function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main
        className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'
          }`}
      >
        <Outlet />
      </main>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Checkout Routes - Always Light Mode */}
          <Route path="/checkout/:productId/:planId" element={<Checkout />} />
          <Route path="/obrigado/:correlationId" element={<Obrigado />} />
          <Route path="/c/:slug" element={<ShortLinkRedirect />} />

          {/* Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Dashboard Routes - Protected & With Theme Provider */}
          <Route element={
            <ProtectedRoute>
              <ThemeProvider>
                <DashboardLayout />
              </ThemeProvider>
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/produtos/novo" element={<ProdutoForm />} />
            <Route path="/produtos/:id" element={<ProdutoForm />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/order-bumps" element={<OrderBumps />} />
            <Route path="/order-bumps/novo" element={<OrderBumpForm />} />
            <Route path="/order-bumps/:id" element={<OrderBumpForm />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/pixels" element={<Pixels />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
