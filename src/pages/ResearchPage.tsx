import { useAppState } from '../context/AppStateContext';
import './ResearchPage.css';

export default function ResearchPage() {
  const { setCurrentPage } = useAppState();

  return (
    <div className="research-page">
      {/* Hero */}
      <section className="research-hero">
        <h1 className="research-hero-title">
          Knowledge-Guided Generative AI for Geothermal Energy Systems
        </h1>
        <p className="research-hero-text">
          This research project introduces a knowledge-guided generative AI framework
          designed to revolutionize the simulation and management of geothermal energy
          systems. By transitioning from traditional deterministic solvers to
          diffusion-based generative models, the framework captures the complex physical
          variability and uncertainty inherent in subsurface environments.
        </p>
      </section>

      {/* Infographic */}
      <section className="research-section">
        <h2 className="research-section-title">Framework Overview</h2>
        <div className="research-infographic">
          <img
            src={`${import.meta.env.BASE_URL}images/research-infographic.jpg`}
            alt="Reimagining Geothermal Energy: A Knowledge-Guided Generative AI Framework — showing three pillars (Generative Physics-Informed Simulation, Adaptive Multi-Objective Operations, Site-Specific Physics Calibration) and national impact goals"
          />
        </div>
      </section>

      {/* Three Core Pillars */}
      <section className="research-section">
        <h2 className="research-section-title">Three Core Pillars</h2>
        <div className="research-pillars">
          <div className="research-pillar">
            <span className="research-pillar-icon">🌊</span>
            <h3 className="research-pillar-title">Trustworthy Spatiotemporal Simulations</h3>
            <p className="research-pillar-text">
              Creating reliable, physics-consistent simulations of subsurface temperature,
              pressure, and flow fields using diffusion-based generative models that
              capture the complex variability of geothermal reservoirs.
            </p>
          </div>
          <div className="research-pillar">
            <span className="research-pillar-icon">🎯</span>
            <h3 className="research-pillar-title">Adaptive Multi-Objective Policies</h3>
            <p className="research-pillar-text">
              Developing intelligent control policies that balance energy production
              with reservoir longevity, optimizing injection schedules to maximize
              thermal output while maintaining reservoir safety and sustainability.
            </p>
          </div>
          <div className="research-pillar">
            <span className="research-pillar-icon">🔍</span>
            <h3 className="research-pillar-title">AI-Driven Physical Law Discovery</h3>
            <p className="research-pillar-text">
              Discovering site-specific physical laws through AI-driven calibration,
              enabling the framework to adapt and transfer across different geological
              sites with varying subsurface characteristics.
            </p>
          </div>
        </div>
      </section>

      {/* Goals */}
      <section className="research-section">
        <h2 className="research-section-title">Goals &amp; Impact</h2>
        <div className="research-goals">
          <p className="research-goals-text">
            These innovations aim to support the <strong>U.S. Department of Energy's
            goals for clean energy security</strong> by making geothermal operations more
            sustainable, predictable, and transferable across different geological sites.
            Ultimately, the initiative seeks to provide a <strong>digital twin
            environment</strong> that enhances risk assessment and operational efficiency
            for reliable baseload power.
          </p>
        </div>
      </section>

      {/* Collaborating PIs */}
      <section className="research-section">
        <h2 className="research-section-title">Collaborating PIs</h2>
        <div className="research-pis">
          <div className="research-pi">
            <span className="research-pi-name">Yanjie Fu</span>
            <span className="research-pi-affiliation">Arizona State University</span>
          </div>
          <div className="research-pi">
            <span className="research-pi-name">Nori Nakata</span>
            <span className="research-pi-affiliation">Staff Scientist, Energy Geosciences Division, Lawrence Berkeley National Laboratory</span>
          </div>
          <div className="research-pi">
            <span className="research-pi-name">Kunpeng Liu</span>
            <span className="research-pi-affiliation">Clemson University</span>
          </div>
          <div className="research-pi">
            <span className="research-pi-name">Dongjie Wang</span>
            <span className="research-pi-affiliation">University of Kansas</span>
          </div>
          <div className="research-pi">
            <span className="research-pi-name">Guodong Chen</span>
            <span className="research-pi-affiliation">University of California, Berkeley and Lawrence Berkeley National Laboratory</span>
          </div>
        </div>
      </section>

      {/* Preliminary Papers */}
      <section className="research-section">
        <h2 className="research-section-title">Preliminary Papers</h2>
        <div className="research-papers">
          <div className="research-paper">
            <a
              className="research-paper-title"
              href="https://arxiv.org/abs/2505.18204"
              target="_blank"
              rel="noopener noreferrer"
            >
              Brownian Bridge Augmented Surrogate Simulation and Injection Planning for Geological CO2 Storage
            </a>
            <span className="research-paper-authors">
              Haoyue Bai, Guodong Chen, Wangyang Ying, Xinyuan Wang, Nanxu Gong, Sixun Dong, Giulia Pedrielli, Haoyu Wang, Haifeng Chen, Yanjie Fu
            </span>
            <a
              className="research-paper-link"
              href="https://arxiv.org/abs/2505.18204"
              target="_blank"
              rel="noopener noreferrer"
            >
              arXiv:2505.18204
            </a>
          </div>
          <div className="research-paper">
            <a
              className="research-paper-title"
              href="https://arxiv.org/abs/2508.19487"
              target="_blank"
              rel="noopener noreferrer"
            >
              Data-Efficient Symbolic Regression via Foundation Model Distillation
            </a>
            <span className="research-paper-authors">
              Wangyang Ying, Jinghan Zhang, Haoyue Bai, Nanxu Gong, Xinyuan Wang, Kunpeng Liu, Chandan K. Reddy, Yanjie Fu
            </span>
            <a
              className="research-paper-link"
              href="https://arxiv.org/abs/2508.19487"
              target="_blank"
              rel="noopener noreferrer"
            >
              arXiv:2508.19487
            </a>
          </div>
          <div className="research-paper">
            <a
              className="research-paper-title"
              href="https://arxiv.org/abs/2505.15572"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bridging the Domain Gap in Equation Distillation with Reinforcement Feedback
            </a>
            <span className="research-paper-authors">
              Wangyang Ying, Haoyue Bai, Nanxu Gong, Xinyuan Wang, Sixun Dong, Haifeng Chen, Yanjie Fu
            </span>
            <a
              className="research-paper-link"
              href="https://arxiv.org/abs/2505.15572"
              target="_blank"
              rel="noopener noreferrer"
            >
              arXiv:2505.15572
            </a>
          </div>
          <div className="research-paper">
            <a
              className="research-paper-title"
              href="https://escholarship.org/uc/item/4x8868mf"
              target="_blank"
              rel="noopener noreferrer"
            >
              Characterizing the Geothermal Lithium Resource at the Salton Sea
            </a>
            <span className="research-paper-authors">
              Patrick Dobson, Naod Araya, Maryjo Brounce, Margaret Busse, Mary Kay Camarillo, Lauren English, Jennifer Humphreys, Boriana Kalderon-Asael, Michael McKibben, Dev Millstein, Nori Nakata, John O'Sullivan, Noah Planavsky, Joris Popineau, Theo Renaud, Jeremy Riffault, Margaret Slattery, Eric Sonnenthal, Nicolas Spycher, Jennifer Stokes-Draut, William Stringfellow, Malcolm White, et al.
            </span>
            <a
              className="research-paper-link"
              href="https://escholarship.org/uc/item/4x8868mf"
              target="_blank"
              rel="noopener noreferrer"
            >
              eScholarship, 2023
            </a>
          </div>
          <div className="research-paper">
            <a
              className="research-paper-title"
              href="https://doi.org/10.1190/tle37120894.1"
              target="_blank"
              rel="noopener noreferrer"
            >
              Geophysical inversion versus machine learning in inverse problems
            </a>
            <span className="research-paper-authors">
              Yoonsoo Kim, Nori Nakata
            </span>
            <a
              className="research-paper-link"
              href="https://doi.org/10.1190/tle37120894.1"
              target="_blank"
              rel="noopener noreferrer"
            >
              The Leading Edge, 37(12), 2018
            </a>
          </div>
          <div className="research-paper">
            <a
              className="research-paper-title"
              href="https://doi.org/10.1016/j.ynexs.2024.100040"
              target="_blank"
              rel="noopener noreferrer"
            >
              Machine-learning-accelerated multi-objective design of fractured geothermal systems
            </a>
            <span className="research-paper-authors">
              Guodong Chen, Jiu Jiao, Kunpeng Liu, Dongjie Wang, Jinhong Jin
            </span>
            <a
              className="research-paper-link"
              href="https://doi.org/10.1016/j.ynexs.2024.100040"
              target="_blank"
              rel="noopener noreferrer"
            >
              Nexus, 1(4), 2024
            </a>
          </div>
          <div className="research-paper">
            <a
              className="research-paper-title"
              href="https://doi.org/10.1109/TNNLS.2025"
              target="_blank"
              rel="noopener noreferrer"
            >
              Expensive multiobjective optimization guided by attention-enhanced generative models
            </a>
            <span className="research-paper-authors">
              Guodong Chen, Dongjie Wang, Kunpeng Liu, Jiu Jiao, Jinhong Jin
            </span>
            <a
              className="research-paper-link"
              href="https://doi.org/10.1109/TNNLS.2025"
              target="_blank"
              rel="noopener noreferrer"
            >
              IEEE TNNLS, 2025
            </a>
          </div>
        </div>
      </section>

      {/* Demo System Tiers */}
      <section className="research-section">
        <h2 className="research-section-title">Interactive Demo System</h2>
        <div className="research-tiers-flow">
          <div
            className="research-tier"
            style={{ flex: 1 }}
            onClick={() => setCurrentPage('explorer')}
          >
            <div className="research-tier-header">
              <span className="research-tier-badge">TIER 1</span>
            </div>
            <h3 className="research-tier-name">Data Explorer</h3>
            <p className="research-tier-desc">
              Visualize real Brady Hot Springs field data: 12 geothermal wells,
              time-series monitoring, and 3D subsurface temperature distribution.
            </p>
          </div>

          <span className="research-tier-arrow">→</span>

          <div
            className="research-tier"
            style={{ flex: 1 }}
            onClick={() => setCurrentPage('predictions')}
          >
            <div className="research-tier-header">
              <span className="research-tier-badge">TIER 2</span>
            </div>
            <h3 className="research-tier-name">Predictions</h3>
            <p className="research-tier-desc">
              CNN surrogate model predicts temperature fields from fracture patterns.
              Compare predictions against ground truth in real time.
            </p>
          </div>

          <span className="research-tier-arrow">→</span>

          <div
            className="research-tier"
            style={{ flex: 1 }}
            onClick={() => setCurrentPage('optimization')}
          >
            <div className="research-tier-header">
              <span className="research-tier-badge">TIER 3</span>
            </div>
            <h3 className="research-tier-name">Optimization</h3>
            <p className="research-tier-desc">
              Optimize injection rates over time to maximize thermal energy production
              while maintaining reservoir safety and sustainability.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
