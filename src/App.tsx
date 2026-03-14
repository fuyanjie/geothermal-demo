import { AppStateProvider, useAppState } from './context/AppStateContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardLayout from './components/layout/DashboardLayout';
import PredictionsPage from './pages/PredictionsPage';
import OptimizationPage from './pages/OptimizationPage';
import './App.css';

function PageRouter() {
  const { currentPage } = useAppState();
  switch (currentPage) {
    case 'predictions':
      return <PredictionsPage />;
    case 'optimization':
      return <OptimizationPage />;
    case 'explorer':
    default:
      return <DashboardLayout />;
  }
}

function App() {
  return (
    <AppStateProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <Header />
          <PageRouter />
        </main>
      </div>
    </AppStateProvider>
  );
}

export default App;
