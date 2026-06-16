import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { EnvironmentsProvider } from './contexts/EnvironmentsContext';
import { AIProvidersProvider } from './contexts/AIProvidersContext';
import { AnalysesProvider } from './contexts/AnalysesContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Environments from './pages/Environments';
import AIProviders from './pages/AIProviders';
import Analyses from './pages/Analyses';
import AnalysisDetail from './pages/AnalysisDetail';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Automation from './pages/Automation';
import Integrations from './pages/Integrations';

export default function App() {
  return (
    <ThemeProvider>
    <EnvironmentsProvider>
      <AIProvidersProvider>
        <AnalysesProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/environments" element={<Environments />} />
                <Route path="/ai-providers" element={<AIProviders />} />
                <Route path="/analyses" element={<Analyses />} />
                <Route path="/analyses/:id" element={<AnalysisDetail />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/automation" element={<Automation />} />
                <Route path="/integrations" element={<Integrations />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </AnalysesProvider>
      </AIProvidersProvider>
    </EnvironmentsProvider>
    </ThemeProvider>
  );
}
