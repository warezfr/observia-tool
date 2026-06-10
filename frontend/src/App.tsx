import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { EnvironmentsProvider } from './contexts/EnvironmentsContext';
import { AIProvidersProvider } from './contexts/AIProvidersContext';
import { AnalysesProvider } from './contexts/AnalysesContext';
import Dashboard from './pages/Dashboard';
import Environments from './pages/Environments';
import AIProviders from './pages/AIProviders';
import Analyses from './pages/Analyses';
import AnalysisDetail from './pages/AnalysisDetail';

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/environments', label: 'Environments' },
  { to: '/ai-providers', label: 'AI Providers' },
  { to: '/analyses', label: 'Analyses' },
];

function App() {
  return (
    <EnvironmentsProvider>
      <AIProvidersProvider>
        <AnalysesProvider>
          <BrowserRouter>
          <div className="min-h-screen bg-gray-950 text-white flex">
            <nav className="w-56 bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-1">
              <h1 className="text-lg font-bold text-purple-400 mb-6">Observia</h1>
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded text-sm transition-colors ${
                      isActive
                        ? 'bg-purple-700 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <main className="flex-1 p-6 overflow-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/environments" element={<Environments />} />
                <Route path="/ai-providers" element={<AIProviders />} />
                <Route path="/analyses" element={<Analyses />} />
                <Route path="/analyses/:id" element={<AnalysisDetail />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
        </AnalysesProvider>
      </AIProvidersProvider>
    </EnvironmentsProvider>
  );
}

export default App
