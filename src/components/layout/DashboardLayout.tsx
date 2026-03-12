import SiteOverviewMap from '../map/SiteOverviewMap';
import TimeSeriesPanel from '../charts/TimeSeriesPanel';
import SubsurfaceView from '../subsurface/SubsurfaceView';
import ControlBar from '../controls/ControlBar';
import './DashboardLayout.css';

export default function DashboardLayout() {
  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div className="panel panel-map">
          <div className="panel-header">Site Overview</div>
          <div className="panel-body">
            <SiteOverviewMap />
          </div>
        </div>
        <div className="panel panel-3d">
          <div className="panel-header">3D Subsurface View</div>
          <div className="panel-body">
            <SubsurfaceView />
          </div>
        </div>
        <div className="panel panel-charts">
          <div className="panel-header">Time Series</div>
          <div className="panel-body">
            <TimeSeriesPanel />
          </div>
        </div>
      </div>
      <ControlBar />
    </div>
  );
}
