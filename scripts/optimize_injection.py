#!/usr/bin/env python3
"""
Pre-compute optimized injection schedules for 20 test fracture scenarios.

Uses the trained CNN surrogate model as a fast simulator, combined with
analytical injection-rate effects. Optimizes injection well rates over time
using SciPy differential_evolution.

Objective: maximize thermal energy production while maintaining reservoir
safety, stability, and sustainability.

Decision variables: 3 injection wells × 11 timesteps = 33 floats in [0, 1].

Usage:
  python scripts/optimize_injection.py
"""

import os
import json
import time
import numpy as np

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf
from scipy.optimize import differential_evolution

# ---------- config ----------
SCRIPT_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(SCRIPT_DIR, 'train_data', 'surrogate_model.keras')
TEST_DIR = os.path.join(SCRIPT_DIR, '..', 'public', 'data', 'predictions')
OUT_DIR = os.path.join(SCRIPT_DIR, '..', 'public', 'data', 'optimization')

GRID_SIZE = 64
N_TIMESTEPS = 11

# Well positions on the 64×64 grid
PRODUCTION_WELLS = [(24, 24), (32, 40), (40, 28)]
INJECTION_WELLS = [(8, 8), (56, 8), (32, 56)]

# Injection effect parameters
ALPHA = 0.3    # cooling strength
SIGMA = 8.0    # spatial spread (grid cells)
SAFETY_THRESHOLD = 0.8

# Objective weights
W_ENERGY = 0.5
W_SUSTAINABILITY = 0.3
W_SAFETY = 0.2

# Optimization settings
BASELINE_RATE = 0.5
MAX_ITER = 50
POP_SIZE = 10
SEED = 42

# ---------- load model and test data ----------
print('Loading surrogate model ...')
model = tf.keras.models.load_model(MODEL_PATH)
print(f'  Model loaded: {model.count_params():,} params')

print('Loading test data ...')
with open(os.path.join(TEST_DIR, 'metadata.json')) as f:
    meta = json.load(f)

num_samples = meta['numSamples']
frac_raw = np.fromfile(os.path.join(TEST_DIR, 'test_fractures.bin'), dtype=np.uint8)
fractures = frac_raw.reshape(num_samples, GRID_SIZE, GRID_SIZE)
print(f'  {num_samples} test fracture patterns loaded')


# ---------- helper functions ----------
def predict_all_timesteps(fracture_field):
    """Predict base temperature fields for all 11 timesteps (batched)."""
    batch = np.zeros((N_TIMESTEPS, GRID_SIZE, GRID_SIZE, 2), dtype=np.float32)
    for t in range(N_TIMESTEPS):
        batch[t, :, :, 0] = fracture_field.astype(np.float32)
        batch[t, :, :, 1] = t / (N_TIMESTEPS - 1)
    preds = model.predict(batch, verbose=0)  # (11, 64, 64, 1)
    return preds[:, :, :, 0]  # (11, 64, 64)


def apply_injection_effects(base_temps, injection_rates):
    """Apply analytical injection cooling to base temperature fields.

    base_temps: (N_TIMESTEPS, 64, 64)
    injection_rates: (3, N_TIMESTEPS) — one rate per injection well per timestep
    Returns: (N_TIMESTEPS, 64, 64) modified temperatures
    """
    modified = base_temps.copy()
    sigma2 = 2 * SIGMA * SIGMA

    # Pre-compute distance grids for each injection well
    yy, xx = np.meshgrid(np.arange(GRID_SIZE), np.arange(GRID_SIZE), indexing='ij')

    for w, (wx, wy) in enumerate(INJECTION_WELLS):
        dx = xx - wx
        dy = yy - wy
        dist2 = dx * dx + dy * dy
        gaussian = np.exp(-dist2 / sigma2)  # (64, 64)

        for t in range(N_TIMESTEPS):
            rate = injection_rates[w, t]
            if rate > 0:
                modified[t] += -rate * ALPHA * gaussian

    return modified


def compute_kpis(temp_fields, injection_rates):
    """Compute energy, sustainability, safety KPIs.

    temp_fields: (N_TIMESTEPS, 64, 64)
    injection_rates: (3, N_TIMESTEPS)
    """
    # Energy: average temperature at production wells across all timesteps
    energy_sum = 0.0
    for t in range(N_TIMESTEPS):
        for (px, py) in PRODUCTION_WELLS:
            energy_sum += temp_fields[t, py, px]
    energy = energy_sum / (N_TIMESTEPS * len(PRODUCTION_WELLS))

    # Sustainability: mean temperature at final timestep
    sustainability = float(temp_fields[-1].mean())

    # Safety: penalty for rates exceeding threshold
    safety_penalty = 0.0
    for w in range(len(INJECTION_WELLS)):
        for t in range(N_TIMESTEPS):
            r = injection_rates[w, t]
            if r > SAFETY_THRESHOLD:
                safety_penalty += (r - SAFETY_THRESHOLD) ** 2

    # Combined score
    overall = W_ENERGY * energy + W_SUSTAINABILITY * sustainability - W_SAFETY * safety_penalty

    return {
        'energy': round(float(energy), 4),
        'sustainability': round(float(sustainability), 4),
        'safety': round(float(safety_penalty), 4),
        'overallScore': round(float(overall), 4),
    }


def objective(rates_flat, base_temps):
    """Objective function for optimization (minimization → negate score)."""
    rates = rates_flat.reshape(len(INJECTION_WELLS), N_TIMESTEPS)
    modified = apply_injection_effects(base_temps, rates)
    kpis = compute_kpis(modified, rates)
    return -kpis['overallScore']  # negate for minimization


# ---------- run optimization ----------
print(f'\nRunning optimization for {num_samples} scenarios ...')
print(f'  Wells: {len(PRODUCTION_WELLS)} production, {len(INJECTION_WELLS)} injection')
print(f'  Decision variables: {len(INJECTION_WELLS) * N_TIMESTEPS} (3 wells × 11 timesteps)')
print(f'  Method: differential_evolution (maxiter={MAX_ITER}, popsize={POP_SIZE})')
print()

results = {
    'wellConfig': {
        'productionWells': [{'x': x, 'y': y} for x, y in PRODUCTION_WELLS],
        'injectionWells': [{'x': x, 'y': y} for x, y in INJECTION_WELLS],
        'alpha': ALPHA,
        'sigma': SIGMA,
        'safetyThreshold': SAFETY_THRESHOLD,
    },
    'objectiveWeights': {
        'energy': W_ENERGY,
        'sustainability': W_SUSTAINABILITY,
        'safety': W_SAFETY,
    },
    'scenarios': [],
}

total_start = time.time()

for i in range(num_samples):
    t_start = time.time()
    print(f'  Scenario {i + 1}/{num_samples} ...', end=' ', flush=True)

    # Get base temperature predictions from CNN surrogate
    base_temps = predict_all_timesteps(fractures[i])

    # --- Baseline: constant injection rate ---
    baseline_rates = np.full((len(INJECTION_WELLS), N_TIMESTEPS), BASELINE_RATE)
    baseline_temps = apply_injection_effects(base_temps, baseline_rates)
    baseline_kpis = compute_kpis(baseline_temps, baseline_rates)

    # --- Optimized: differential evolution ---
    n_vars = len(INJECTION_WELLS) * N_TIMESTEPS
    bounds = [(0.0, 1.0)] * n_vars

    result = differential_evolution(
        objective,
        bounds=bounds,
        args=(base_temps,),
        maxiter=MAX_ITER,
        popsize=POP_SIZE,
        seed=SEED + i,
        tol=0.01,
        workers=1,
    )

    opt_rates = result.x.reshape(len(INJECTION_WELLS), N_TIMESTEPS)
    opt_temps = apply_injection_effects(base_temps, opt_rates)
    opt_kpis = compute_kpis(opt_temps, opt_rates)

    # Improvement percentage
    if baseline_kpis['overallScore'] != 0:
        improvement = ((opt_kpis['overallScore'] - baseline_kpis['overallScore'])
                       / abs(baseline_kpis['overallScore'])) * 100
    else:
        improvement = 0.0

    opt_kpis['improvementPct'] = round(improvement, 1)

    # Per-timestep temperature at production wells (for line charts)
    baseline_prod_temps = []
    optimized_prod_temps = []
    for t in range(N_TIMESTEPS):
        bt = [round(float(baseline_temps[t, py, px]), 4) for px, py in PRODUCTION_WELLS]
        ot = [round(float(opt_temps[t, py, px]), 4) for px, py in PRODUCTION_WELLS]
        baseline_prod_temps.append(bt)
        optimized_prod_temps.append(ot)

    scenario = {
        'sampleIndex': i,
        'baseline': {
            'schedule': [[round(float(baseline_rates[w, t]), 2)
                          for t in range(N_TIMESTEPS)]
                         for w in range(len(INJECTION_WELLS))],
            **baseline_kpis,
            'prodTemps': baseline_prod_temps,
        },
        'optimized': {
            'schedule': [[round(float(opt_rates[w, t]), 2)
                          for t in range(N_TIMESTEPS)]
                         for w in range(len(INJECTION_WELLS))],
            **opt_kpis,
            'prodTemps': optimized_prod_temps,
        },
    }

    results['scenarios'].append(scenario)
    elapsed = time.time() - t_start
    print(f'done ({elapsed:.1f}s) | baseline={baseline_kpis["overallScore"]:.4f} '
          f'→ optimized={opt_kpis["overallScore"]:.4f} ({improvement:+.1f}%)')

total_elapsed = time.time() - total_start
print(f'\nAll scenarios completed in {total_elapsed:.1f}s')

# ---------- save results ----------
os.makedirs(OUT_DIR, exist_ok=True)
out_path = os.path.join(OUT_DIR, 'opt_results.json')
with open(out_path, 'w') as f:
    json.dump(results, f, separators=(',', ':'))

file_size = os.path.getsize(out_path)
print(f'\nSaved: {out_path}')
print(f'  Size: {file_size / 1e3:.1f} KB')

# Summary statistics
improvements = [s['optimized']['improvementPct'] for s in results['scenarios']]
print(f'\nImprovement summary:')
print(f'  Mean: {np.mean(improvements):+.1f}%')
print(f'  Min:  {np.min(improvements):+.1f}%')
print(f'  Max:  {np.max(improvements):+.1f}%')
print('\nDone!')
