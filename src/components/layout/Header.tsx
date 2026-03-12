import { useAppState } from '../../context/AppStateContext';
import { wells } from '../../data';
import { formatDate } from '../../utils/formatters';
import './Header.css';

export default function Header() {
  const { selectedWellId, currentDate } = useAppState();
  const well = wells.find((w) => w.id === selectedWellId);

  return (
    <header className="header">
      <div className="header-left">
        <h2 className="header-title">Data Explorer</h2>
        <span className="header-separator">—</span>
        <span className="header-location">Salton Sea Geothermal Field, California</span>
      </div>
      <div className="header-right">
        {well && <span className="header-well">{well.name}</span>}
        {currentDate && <span className="header-date">{formatDate(currentDate)}</span>}
      </div>
    </header>
  );
}
