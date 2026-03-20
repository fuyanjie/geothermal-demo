import { useState, useCallback, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import type { PageId } from '../../context/AppStateContext';
import './GuidedTour.css';

interface TourStep {
  page: PageId;
  title: string;
  description: string;
  highlight?: string; // optional CSS class to highlight
}

const TOUR_STEPS: TourStep[] = [
  {
    page: 'research',
    title: 'Welcome to Geothermal AI',
    description: 'This demo showcases a knowledge-guided generative AI framework for geothermal energy systems. The project develops trustworthy simulations, adaptive optimization policies, and AI-driven physical law discovery for subsurface energy management.',
  },
  {
    page: 'explorer',
    title: 'Tier 1: Data Explorer',
    description: 'Explore real geothermal field data from Brady Hot Springs, Nevada. View well locations on the map, monitor time-series data (temperature, pressure, flow rate, injection rate), and visualize the 3D subsurface temperature distribution.',
  },
  {
    page: 'predictions',
    title: 'Tier 2: Forward Prediction',
    description: 'A lightweight CNN surrogate model (58K parameters) predicts subsurface temperature fields from fracture patterns in real time. Compare predictions against ground truth across multiple timesteps. Use the Play button to see temporal dynamics.',
  },
  {
    page: 'predictions',
    title: 'Tier 2: Inverse Modeling',
    description: 'The inverse modeling tab demonstrates fracture field inference from observed temperatures. Using Monte Carlo search with the CNN forward model, it identifies fracture configurations that best explain observed thermal patterns \u2014 a key capability for data assimilation.',
  },
  {
    page: 'optimization',
    title: 'Tier 3: Injection Optimization',
    description: 'Optimize injection rates across 3 wells and 11 timesteps to maximize energy production while maintaining reservoir safety and sustainability. Compare baseline vs optimized schedules, view the Pareto trade-off analysis, and experiment with custom injection strategies.',
  },
];

interface GuidedTourProps {
  active: boolean;
  onClose: () => void;
}

export default function GuidedTour({ active, onClose }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const { setCurrentPage } = useAppState();

  const step = TOUR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  // Navigate to correct page when tour starts
  useEffect(() => {
    if (active) {
      setStepIndex(0);
      setCurrentPage(TOUR_STEPS[0].page);
    }
  }, [active, setCurrentPage]);

  const goToStep = useCallback((idx: number) => {
    setStepIndex(idx);
    setCurrentPage(TOUR_STEPS[idx].page);
  }, [setCurrentPage]);

  const handleNext = useCallback(() => {
    if (isLast) {
      onClose();
      setStepIndex(0);
    } else {
      goToStep(stepIndex + 1);
    }
  }, [isLast, stepIndex, goToStep, onClose]);

  const handlePrev = useCallback(() => {
    if (!isFirst) goToStep(stepIndex - 1);
  }, [isFirst, stepIndex, goToStep]);

  const handleClose = useCallback(() => {
    onClose();
    setStepIndex(0);
  }, [onClose]);

  if (!active) return null;

  return (
    <>
      <div className="tour-backdrop" onClick={handleClose} />
      <div className="tour-dialog">
        <div className="tour-header">
          <div className="tour-step-indicator">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`tour-dot ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'completed' : ''}`}
                onClick={() => goToStep(i)}
              />
            ))}
          </div>
          <button className="tour-close" onClick={handleClose}>{'\u2715'}</button>
        </div>
        <div className="tour-body">
          <div className="tour-step-badge">Step {stepIndex + 1} of {TOUR_STEPS.length}</div>
          <h3 className="tour-title">{step.title}</h3>
          <p className="tour-description">{step.description}</p>
        </div>
        <div className="tour-footer">
          <button
            className="tour-btn tour-btn-secondary"
            onClick={handlePrev}
            disabled={isFirst}
          >
            Previous
          </button>
          <button className="tour-btn tour-btn-primary" onClick={handleNext}>
            {isLast ? 'Finish Tour' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
