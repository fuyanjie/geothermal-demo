import { useAppState } from '../../context/AppStateContext';
import { formatDate } from '../../utils/formatters';
import './TimeSlider.css';

export default function TimeSlider() {
  const { timestepIndex, setTimestepIndex, numTimesteps, currentDate } = useAppState();

  return (
    <div className="time-slider">
      <label className="time-slider-label">Time</label>
      <input
        type="range"
        className="time-slider-input"
        min={0}
        max={numTimesteps - 1}
        value={timestepIndex}
        onChange={(e) => setTimestepIndex(Number(e.target.value))}
      />
      <span className="time-slider-date">{formatDate(currentDate)}</span>
    </div>
  );
}
