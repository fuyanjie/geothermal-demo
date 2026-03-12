import { useAppState } from '../../context/AppStateContext';
import type { SubsurfaceField } from '../../types';
import './FieldToggle.css';

const options: { value: SubsurfaceField; label: string }[] = [
  { value: 'temperature', label: 'Temp' },
  { value: 'pressure', label: 'Pressure' },
];

export default function FieldToggle() {
  const { subsurfaceField, setSubsurfaceField } = useAppState();

  return (
    <div className="field-toggle">
      <label className="field-toggle-label">3D Field</label>
      <div className="field-toggle-group">
        {options.map((opt) => (
          <button
            key={opt.value}
            className={`field-toggle-btn ${subsurfaceField === opt.value ? 'active' : ''}`}
            onClick={() => setSubsurfaceField(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
