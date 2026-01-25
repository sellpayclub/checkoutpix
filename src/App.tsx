import { useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Sidebar } from './components/dashboard';
import { ThemeProvider } from './contexts/ThemeContext';

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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Checkout Routes - Always Light Mode */}
        <Route path="/checkout/:productId/:planId" element={<Checkout />} />
        <Route path="/obrigado/:correlationId" element={<Obrigado />} />

        {/* Dashboard Routes - With Theme Provider */}
        <Route element={
          <ThemeProvider>
            <DashboardLayout />
          </ThemeProvider>
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
    </BrowserRouter>
  );
}

export default App;
