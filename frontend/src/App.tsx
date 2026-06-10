import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { EnvironmentsProvider } from './contexts/EnvironmentsContext';
import { AIProvidersProvider } from './contexts/AIProvidersContext';
import { AnalysesProvider } from './contexts/AnalysesContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Environments from './pages/Environments';
import AIProviders from './pages/AIProviders';
import Analyses from './pages/Analyses';
import AnalysisDetail from './pages/AnalysisDetail';

export default function App() {
  return (
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
              </Routes>
            </Layout>
          </BrowserRouter>
        </AnalysesProvider>
      </AIProvidersProvider>
    </EnvironmentsProvider>
  );
}
