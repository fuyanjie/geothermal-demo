import { useAppState, type PageId } from '../../context/AppStateContext';
import './Sidebar.css';

interface NavItem {
  id: PageId;
  label: string;
  enabled: boolean;
  icon: string;
}

const navItems: NavItem[] = [
  { id: 'research', label: 'Research', enabled: true, icon: '🔬' },
  { id: 'dashboard', label: 'Dashboard', enabled: true, icon: '📋' },
  { id: 'explorer', label: 'Data Explorer', enabled: true, icon: '📊' },
  { id: 'predictions', label: 'Predictions', enabled: true, icon: '🔮' },
  { id: 'optimization', label: 'Optimization', enabled: true, icon: '⚙️' },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage } = useAppState();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1 className="sidebar-title">Geothermal AI</h1>
        <p className="sidebar-subtitle">Brady Hot Springs</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${item.id === currentPage ? 'active' : ''} ${!item.enabled ? 'disabled' : ''}`}
            disabled={!item.enabled}
            onClick={() => {
              if (item.enabled) {
                setCurrentPage(item.id);
              }
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {!item.enabled && <span className="nav-badge">Soon</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p>ASU–KU Collaboration</p>
      </div>
    </aside>
  );
}
