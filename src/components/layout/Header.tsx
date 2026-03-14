import { useAppState } from '../../context/AppStateContext';
import { wells } from '../../data';
import { formatDate } from '../../utils/formatters';
import './Header.css';

export default function Header() {
  const { currentPage, selectedWellId, currentDate } = useAppState();
  const well = wells.find((w) => w.id === selectedWellId);

  const isExplorer = currentPage === 'explorer';

  const pageTitle = currentPage === 'explorer'
    ? 'Data Explorer'
    : currentPage === 'predictions'
      ? 'Predictions'
      : 'Optimization';

  const pageSubtitle = currentPage === 'explorer'
    ? 'Brady Hot Springs Geothermal Field, Nevada'
    : currentPage === 'predictions'
      ? 'Surrogate Model — Fracture → Temperature'
      : 'Injection Rate Optimization';

  return (
    <header className="header">
      <div className="header-left">
        <h2 className="header-title">{pageTitle}</h2>
        <span className="header-separator">—</span>
        <span className="header-location">{pageSubtitle}</span>
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
