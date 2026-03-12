import { AppStateProvider } from './context/AppStateContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardLayout from './components/layout/DashboardLayout';
import './App.css';

function App() {
  return (
    <AppStateProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <Header />
          <DashboardLayout />
        </main>
      </div>
    </AppStateProvider>
  );
}

export default App;
