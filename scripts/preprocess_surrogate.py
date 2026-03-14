#!/usr/bin/env python3
"""
Preprocess Binary.mat and state_training.mat for browser-based visualization.

Reads HDF5 (.mat v7.3) files, downsamples 128x128 → 64x64,
splits into train/test, and exports compact binary files for the browser.

Output files (in public/data/predictions/):
  - test_fractures.bin    : 20 samples × 64 × 64, uint8 (0 or 1)
  - test_temperatures.bin : 20 samples × 11 timesteps × 64 × 64, float32
  - metadata.json         : dimensions + value ranges
  - train_fractures.npy   : 980 × 64 × 64, float32 (for model training)
  - train_temperatures.npy: 980 × 11 × 64 × 64, float32 (for model training)

Usage:
  python scripts/preprocess_surrogate.py
"""

import json
import os
import numpy as np
import h5py
from scipy.ndimage import zoom

# ---------- config ----------
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'predictions')
TRAIN_DIR = os.path.join(os.path.dirname(__file__), 'train_data')

GRID_SIZE = 64          # downsample target
N_TEST = 20             # number of test samples
SEED = 42

# ---------- read .mat files ----------
print('Reading Binary.mat ...')
with h5py.File(os.path.join(DATA_DIR, 'Binary.mat'), 'r') as f:
    # Shape: (128, 128, 1000) — need to handle HDF5 transposition
    binary_raw = f['Binary'][:]  # h5py reads as stored
    print(f'  Raw shape: {binary_raw.shape}')

print('Reading state_training.mat ...')
with h5py.File(os.path.join(DATA_DIR, 'state_training.mat'), 'r') as f:
    state_raw = f['state_training'][:]
    print(f'  Raw shape: {state_raw.shape}')

# ---------- reshape to (samples, ..., H, W) ----------
# HDF5/MATLAB stores in column-major; h5py reads transposed.
# Binary: stored (128,128,1000) in MATLAB → read as (1000,128,128) by h5py
# state_training: stored (11,128,128,1000) in MATLAB → read as (1000,128,128,11) by h5py

if binary_raw.shape[0] == 1000:
    # h5py transposed: (1000, 128, 128)
    fractures = binary_raw  # (1000, 128, 128)
elif binary_raw.shape[2] == 1000:
    # not transposed: (128, 128, 1000)
    fractures = np.transpose(binary_raw, (2, 0, 1))  # → (1000, 128, 128)
else:
    raise ValueError(f'Unexpected Binary shape: {binary_raw.shape}')

if state_raw.shape[0] == 1000:
    # h5py transposed: (1000, 128, 128, 11) → need (1000, 11, 128, 128)
    temperatures = np.transpose(state_raw, (0, 3, 1, 2))
elif state_raw.shape[3] == 1000:
    # not transposed: (11, 128, 128, 1000) → (1000, 11, 128, 128)
    temperatures = np.transpose(state_raw, (3, 0, 1, 2))
else:
    raise ValueError(f'Unexpected state_training shape: {state_raw.shape}')

print(f'Fractures: {fractures.shape}')       # (1000, 128, 128)
print(f'Temperatures: {temperatures.shape}')  # (1000, 11, 128, 128)

N_SAMPLES = fractures.shape[0]
N_TIMESTEPS = temperatures.shape[1]
ORIG_SIZE = fractures.shape[1]

# ---------- downsample 128×128 → 64×64 ----------
scale = GRID_SIZE / ORIG_SIZE
print(f'Downsampling {ORIG_SIZE}×{ORIG_SIZE} → {GRID_SIZE}×{GRID_SIZE} (scale={scale:.3f}) ...')

frac_down = np.zeros((N_SAMPLES, GRID_SIZE, GRID_SIZE), dtype=np.float32)
temp_down = np.zeros((N_SAMPLES, N_TIMESTEPS, GRID_SIZE, GRID_SIZE), dtype=np.float32)

for i in range(N_SAMPLES):
    # Binary: nearest-neighbor to preserve 0/1
    frac_down[i] = zoom(fractures[i].astype(np.float32), scale, order=0)
    # Temperature: bilinear interpolation
    for t in range(N_TIMESTEPS):
        temp_down[i, t] = zoom(temperatures[i, t].astype(np.float32), scale, order=1)
    if (i + 1) % 100 == 0:
        print(f'  {i + 1}/{N_SAMPLES}')

# Re-binarize fractures (in case zoom introduced float artifacts)
frac_down = (frac_down > 0.5).astype(np.float32)

print(f'Fractures downsampled: {frac_down.shape}, unique={np.unique(frac_down)}')
print(f'Temperatures downsampled: {temp_down.shape}, range=[{temp_down.min():.4f}, {temp_down.max():.4f}]')

# ---------- train/test split ----------
rng = np.random.RandomState(SEED)
indices = rng.permutation(N_SAMPLES)
test_idx = sorted(indices[:N_TEST])
train_idx = sorted(indices[N_TEST:])

frac_test = frac_down[test_idx]
temp_test = temp_down[test_idx]
frac_train = frac_down[train_idx]
temp_train = temp_down[train_idx]

print(f'Train: {frac_train.shape[0]} samples, Test: {frac_test.shape[0]} samples')

# ---------- export test data for browser ----------
os.makedirs(OUT_DIR, exist_ok=True)

# Fractures as uint8 (0 or 1)
frac_test_u8 = frac_test.astype(np.uint8)
frac_test_u8.tofile(os.path.join(OUT_DIR, 'test_fractures.bin'))
print(f'Wrote test_fractures.bin: {frac_test_u8.nbytes} bytes')

# Temperatures as float32
temp_test_f32 = temp_test.astype(np.float32)
temp_test_f32.tofile(os.path.join(OUT_DIR, 'test_temperatures.bin'))
print(f'Wrote test_temperatures.bin: {temp_test_f32.nbytes} bytes')

# Metadata
metadata = {
    'numSamples': int(N_TEST),
    'gridSize': int(GRID_SIZE),
    'numTimesteps': int(N_TIMESTEPS),
    'tempMin': float(temp_down.min()),
    'tempMax': float(temp_down.max()),
    'sampleIds': [int(i) for i in test_idx],
}
with open(os.path.join(OUT_DIR, 'metadata.json'), 'w') as f:
    json.dump(metadata, f, indent=2)
print(f'Wrote metadata.json')

# ---------- export train data for model training ----------
os.makedirs(TRAIN_DIR, exist_ok=True)
np.save(os.path.join(TRAIN_DIR, 'train_fractures.npy'), frac_train)
np.save(os.path.join(TRAIN_DIR, 'train_temperatures.npy'), temp_train)
print(f'Wrote train_fractures.npy: {frac_train.nbytes / 1e6:.1f} MB')
print(f'Wrote train_temperatures.npy: {temp_train.nbytes / 1e6:.1f} MB')

# ---------- summary ----------
print('\n=== Summary ===')
print(f'Grid: {GRID_SIZE}×{GRID_SIZE}')
print(f'Timesteps: {N_TIMESTEPS}')
print(f'Train samples: {len(train_idx)}')
print(f'Test samples: {len(test_idx)}')
print(f'Temperature range: [{metadata["tempMin"]:.4f}, {metadata["tempMax"]:.4f}]')
print(f'Fracture density: {frac_down.mean() * 100:.2f}%')
print(f'\nBrowser files in {OUT_DIR}/:')
print(f'  test_fractures.bin     : {frac_test_u8.nbytes:>10,} bytes')
print(f'  test_temperatures.bin  : {temp_test_f32.nbytes:>10,} bytes')
print(f'  metadata.json          : ~200 bytes')
print(f'  Total for browser      : ~{(frac_test_u8.nbytes + temp_test_f32.nbytes) / 1e6:.1f} MB')
