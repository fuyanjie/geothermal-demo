import { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { wells } from '../../data';
import { formatDate } from '../../utils/formatters';
import './Header.css';

interface HeaderProps {
  onStartTour?: () => void;
}

export default function Header({ onStartTour }: HeaderProps) {
  const { currentPage, selectedWellId, currentDate } = useAppState();
  const well = wells.find((w) => w.id === selectedWellId);

  const isExplorer = currentPage === 'explorer';

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('geothermal-theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('geothermal-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const pageTitles: Record<string, string> = {
    research: 'Research',
    dashboard: 'Dashboard',
    explorer: 'Data Explorer',
    predictions: 'Predictions',
    optimization: 'Optimization',
  };
  const pageSubtitles: Record<string, string> = {
    research: 'Knowledge-Guided Generative AI for Geothermal Energy',
    dashboard: 'System Overview & Key Metrics',
    explorer: 'Brady Hot Springs Geothermal Field, Nevada',
    predictions: 'Surrogate Model — Fracture → Temperature',
    optimization: 'Injection Rate Optimization',
  };

  const pageTitle = pageTitles[currentPage] ?? 'Research';
  const pageSubtitle = pageSubtitles[currentPage] ?? '';

  return (
    <header className="header">
      <div className="header-left">
        <h2 className="header-title">{pageTitle}</h2>
        <span className="header-separator">—</span>
        <span className="header-location">{pageSubtitle}</span>
        {onStartTour && (
          <button className="header-tour-btn" onClick={onStartTour}>
            Guided Tour
          </button>
        )}
        <button className="header-theme-btn" onClick={toggleTheme}>
          {theme === 'dark' ? '\u2600\uFE0F Light' : '\uD83C\uDF19 Dark'}
        </button>
      </div>
      {isExplorer && (
        <div className="header-right">
          {well && <span className="header-well">{well.name}</span>}
          {currentDate && <span className="header-date">{formatDate(currentDate)}</span>}
        </div>
      )}
    </header>
  );
}
