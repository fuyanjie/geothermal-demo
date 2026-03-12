import TimeSlider from './TimeSlider';
import WellSelector from './WellSelector';
import FieldToggle from './FieldToggle';
import './ControlBar.css';

export default function ControlBar() {
  return (
    <div className="control-bar">
      <TimeSlider />
      <div className="control-bar-right">
        <WellSelector />
        <FieldToggle />
      </div>
    </div>
  );
}
