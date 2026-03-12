import './Sidebar.css';

interface NavItem {
  id: string;
  label: string;
  enabled: boolean;
  icon: string;
}

const navItems: NavItem[] = [
  { id: 'explorer', label: 'Data Explorer', enabled: true, icon: '📊' },
  { id: 'predictions', label: 'Predictions', enabled: false, icon: '🔮' },
  { id: 'optimization', label: 'Optimization', enabled: false, icon: '⚙️' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1 className="sidebar-title">Geothermal Demo</h1>
        <p className="sidebar-subtitle">Salton Sea Field</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${item.enabled ? 'active' : 'disabled'}`}
            disabled={!item.enabled}
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
