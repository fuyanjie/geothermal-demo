import { useState } from 'react';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardLayout from './components/layout/DashboardLayout';
import PredictionsPage from './pages/PredictionsPage';
import OptimizationPage from './pages/OptimizationPage';
import ResearchPage from './pages/ResearchPage';
import DashboardPage from './pages/DashboardPage';
import GuidedTour from './components/tour/GuidedTour';
import './App.css';

function PageRouter() {
  const { currentPage } = useAppState();
  switch (currentPage) {
    case 'research':
      return <ResearchPage />;
    case 'dashboard':
      return <DashboardPage />;
    case 'predictions':
      return <PredictionsPage />;
    case 'optimization':
      return <OptimizationPage />;
    case 'explorer':
    default:
      return <DashboardLayout />;
  }
}

function AppContent() {
  const [tourActive, setTourActive] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="app-shell">
        <Sidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}
        <main className="app-main">
          <Header
            onStartTour={() => setTourActive(true)}
            onToggleMenu={() => setMobileMenuOpen((v) => !v)}
          />
          <PageRouter />
        </main>
      </div>
      <GuidedTour active={tourActive} onClose={() => setTourActive(false)} />
    </>
  );
}

function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}

export default App;
