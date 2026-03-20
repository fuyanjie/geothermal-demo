import { useAppState, type PageId } from '../context/AppStateContext';
import './DashboardPage.css';

const pipelineSteps = [
  { label: 'Field Data', icon: '🗂️' },
  { label: 'Surrogate Model', icon: '🧠' },
  { label: 'Predictions', icon: '🔮' },
  { label: 'Optimization', icon: '⚙️' },
  { label: 'Decisions', icon: '✅' },
];

interface TierCard {
  tier: number;
  name: string;
  description: string;
  page: PageId;
}

const tierCards: TierCard[] = [
  {
    tier: 1,
    name: 'Data Explorer',
    description: '7 wells, 60 monthly timesteps, 3D subsurface visualization',
    page: 'explorer',
  },
  {
    tier: 2,
    name: 'Predictions',
    description: '58K-param CNN, forward + inverse modeling, uncertainty quantification',
    page: 'predictions',
  },
  {
    tier: 3,
    name: 'Optimization',
    description: 'Multi-objective optimization, Pareto analysis, sensitivity analysis',
    page: 'optimization',
  },
];

export default function DashboardPage() {
  const { setCurrentPage } = useAppState();

  return (
    <div className="dashboard-page">
      {/* KPI Cards */}
      <div className="dashboard-kpi-row">
        <div className="dashboard-kpi-card dashboard-kpi-card--accuracy">
          <div className="dashboard-kpi-label">Prediction Accuracy</div>
          <div className="dashboard-kpi-value">R² = 0.9847</div>
          <div className="dashboard-kpi-subtitle">CNN Surrogate Model</div>
        </div>
        <div className="dashboard-kpi-card dashboard-kpi-card--energy">
          <div className="dashboard-kpi-label">Energy Improvement</div>
          <div className="dashboard-kpi-value">+3.2%</div>
          <div className="dashboard-kpi-subtitle">Optimized vs Baseline</div>
        </div>
        <div className="dashboard-kpi-card dashboard-kpi-card--inverse">
          <div className="dashboard-kpi-label">Inverse Accuracy</div>
          <div className="dashboard-kpi-value">87.3%</div>
          <div className="dashboard-kpi-subtitle">Fracture Field Recovery</div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="dashboard-pipeline-section">
        <div className="dashboard-section-title">System Pipeline</div>
        <div className="dashboard-pipeline">
          {pipelineSteps.map((step, i) => (
            <span key={step.label} style={{ display: 'contents' }}>
              <div className="dashboard-pipeline-step">
                <span className="dashboard-pipeline-icon">{step.icon}</span>
                <span className="dashboard-pipeline-box">{step.label}</span>
              </div>
              {i < pipelineSteps.length - 1 && (
                <span className="dashboard-pipeline-arrow">→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Tier Cards */}
      <div className="dashboard-section-title">Explore Tiers</div>
      <div className="dashboard-tier-row">
        {tierCards.map((card) => (
          <div
            key={card.tier}
            className="dashboard-tier-card"
            onClick={() => setCurrentPage(card.page)}
          >
            <div className="dashboard-tier-header">
              <span className="dashboard-tier-badge">Tier {card.tier}</span>
              <span className="dashboard-tier-name">{card.name}</span>
            </div>
            <div className="dashboard-tier-desc">{card.description}</div>
            <div className="dashboard-tier-link">Open {card.name} →</div>
          </div>
        ))}
      </div>
    </div>
  );
}
