import { useAppState } from '../../context/AppStateContext';
import { wells } from '../../data';
import './WellSelector.css';

export default function WellSelector() {
  const { selectedWellId, setSelectedWellId } = useAppState();

  return (
    <div className="well-selector">
      <label className="well-selector-label">Well</label>
      <div className="well-selector-buttons">
        {wells.map((w) => (
          <button
            key={w.id}
            className={`well-btn ${w.id === selectedWellId ? 'active' : ''} ${w.type}`}
            onClick={() => setSelectedWellId(w.id)}
            title={`${w.name} (${w.type})`}
          >
            {w.name}
          </button>
        ))}
      </div>
    </div>
  );
}
