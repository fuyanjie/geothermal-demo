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

  const pageTitles: Record<string, string> = {
    research: 'Research',
    explorer: 'Data Explorer',
    predictions: 'Predictions',
    optimization: 'Optimization',
  };
  const pageSubtitles: Record<string, string> = {
    research: 'Knowledge-Guided Generative AI for Geothermal Energy',
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
