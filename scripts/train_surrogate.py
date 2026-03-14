#!/usr/bin/env python3
"""
Train a small U-Net surrogate model: (fracture_field, timestep) → temperature_field.

Input:  64×64×2 (channel 0 = fracture binary, channel 1 = timestep/10 broadcast)
Output: 64×64×1 (predicted temperature field)

Trained on 980 samples × 11 timesteps = 10,780 pairs.
Exports to TensorFlow.js format for in-browser inference.

Usage:
  python scripts/train_surrogate.py
"""

import os
import numpy as np

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # suppress TF info messages
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

# ---------- config ----------
TRAIN_DIR = os.path.join(os.path.dirname(__file__), 'train_data')
TEST_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'predictions')
MODEL_OUT = os.path.join(TEST_DIR, 'tfjs_model')

GRID_SIZE = 64
N_TIMESTEPS = 11
EPOCHS = 20
BATCH_SIZE = 64
LR = 1e-3

# ---------- load training data ----------
print('Loading training data ...')
frac_train = np.load(os.path.join(TRAIN_DIR, 'train_fractures.npy'))   # (980, 64, 64)
temp_train = np.load(os.path.join(TRAIN_DIR, 'train_temperatures.npy'))  # (980, 11, 64, 64)

N_TRAIN = frac_train.shape[0]
print(f'  Fractures: {frac_train.shape}')
print(f'  Temperatures: {temp_train.shape}')

# ---------- build training pairs ----------
# Each (fracture, timestep) → temperature pair
print('Building training pairs ...')
X_frac = []
X_time = []
Y_temp = []

for i in range(N_TRAIN):
    for t in range(N_TIMESTEPS):
        X_frac.append(frac_train[i])
        X_time.append(t / (N_TIMESTEPS - 1))  # normalize to [0, 1]
        Y_temp.append(temp_train[i, t])

X_frac = np.array(X_frac, dtype=np.float32)[..., np.newaxis]  # (N, 64, 64, 1)
X_time = np.array(X_time, dtype=np.float32)                     # (N,)
Y_temp = np.array(Y_temp, dtype=np.float32)[..., np.newaxis]  # (N, 64, 64, 1)

# Build 2-channel input: fracture + timestep broadcast
X_time_channel = np.ones_like(X_frac) * X_time[:, np.newaxis, np.newaxis, np.newaxis]
X_input = np.concatenate([X_frac, X_time_channel], axis=-1)  # (N, 64, 64, 2)

print(f'Training pairs: {X_input.shape[0]}')
print(f'Input shape: {X_input.shape}')
print(f'Output shape: {Y_temp.shape}')

# ---------- build U-Net model ----------
def build_unet(grid_size=64, in_channels=2):
    inputs = keras.Input(shape=(grid_size, grid_size, in_channels))

    # Encoder
    c1 = layers.Conv2D(32, 3, padding='same', activation='relu')(inputs)
    c1 = layers.Conv2D(32, 3, padding='same', activation='relu')(c1)
    p1 = layers.MaxPooling2D(2)(c1)  # 32×32

    c2 = layers.Conv2D(64, 3, padding='same', activation='relu')(p1)
    c2 = layers.Conv2D(64, 3, padding='same', activation='relu')(c2)
    p2 = layers.MaxPooling2D(2)(c2)  # 16×16

    c3 = layers.Conv2D(128, 3, padding='same', activation='relu')(p2)
    c3 = layers.Conv2D(128, 3, padding='same', activation='relu')(c3)
    p3 = layers.MaxPooling2D(2)(c3)  # 8×8

    # Bottleneck
    b = layers.Conv2D(256, 3, padding='same', activation='relu')(p3)
    b = layers.Conv2D(256, 3, padding='same', activation='relu')(b)

    # Decoder
    u3 = layers.UpSampling2D(2)(b)  # 16×16
    u3 = layers.Concatenate()([u3, c3])
    d3 = layers.Conv2D(128, 3, padding='same', activation='relu')(u3)
    d3 = layers.Conv2D(128, 3, padding='same', activation='relu')(d3)

    u2 = layers.UpSampling2D(2)(d3)  # 32×32
    u2 = layers.Concatenate()([u2, c2])
    d2 = layers.Conv2D(64, 3, padding='same', activation='relu')(u2)
    d2 = layers.Conv2D(64, 3, padding='same', activation='relu')(d2)

    u1 = layers.UpSampling2D(2)(d2)  # 64×64
    u1 = layers.Concatenate()([u1, c1])
    d1 = layers.Conv2D(32, 3, padding='same', activation='relu')(u1)
    d1 = layers.Conv2D(32, 3, padding='same', activation='relu')(d1)

    outputs = layers.Conv2D(1, 1, activation='linear')(d1)  # 64×64×1

    model = keras.Model(inputs, outputs, name='fracture_to_temp_unet')
    return model

print('Building U-Net model ...')
model = build_unet(GRID_SIZE, 2)
model.summary()

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=LR),
    loss='mse',
    metrics=['mae'],
)

# ---------- train ----------
print(f'\nTraining for {EPOCHS} epochs ...')
history = model.fit(
    X_input, Y_temp,
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    validation_split=0.1,
    callbacks=[
        keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=5, min_lr=1e-5, verbose=1),
        keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True, verbose=1),
    ],
    verbose=1,
)

# ---------- evaluate on test set ----------
print('\nLoading test data for evaluation ...')
import json

with open(os.path.join(TEST_DIR, 'metadata.json')) as f:
    meta = json.load(f)

frac_test_raw = np.fromfile(os.path.join(TEST_DIR, 'test_fractures.bin'), dtype=np.uint8)
frac_test = frac_test_raw.reshape(meta['numSamples'], GRID_SIZE, GRID_SIZE)

temp_test_raw = np.fromfile(os.path.join(TEST_DIR, 'test_temperatures.bin'), dtype=np.float32)
temp_test = temp_test_raw.reshape(meta['numSamples'], N_TIMESTEPS, GRID_SIZE, GRID_SIZE)

# Build test pairs
X_test_list = []
Y_test_list = []
for i in range(meta['numSamples']):
    for t in range(N_TIMESTEPS):
        frac_ch = frac_test[i:i+1, :, :, np.newaxis].astype(np.float32)  # (1,64,64,1)
        t_norm = t / (N_TIMESTEPS - 1)
        time_ch = np.full_like(frac_ch, t_norm)
        x = np.concatenate([frac_ch, time_ch], axis=-1)  # (1,64,64,2)
        X_test_list.append(x[0])
        Y_test_list.append(temp_test[i, t])

X_test = np.array(X_test_list)                            # (220, 64, 64, 2)
Y_test = np.array(Y_test_list)[..., np.newaxis]           # (220, 64, 64, 1)

test_loss, test_mae = model.evaluate(X_test, Y_test, verbose=0)
print(f'Test MSE: {test_loss:.6f}')
print(f'Test MAE: {test_mae:.6f}')

# R² on test set
Y_pred = model.predict(X_test, verbose=0)
ss_res = np.sum((Y_test - Y_pred) ** 2)
ss_tot = np.sum((Y_test - Y_test.mean()) ** 2)
r2 = 1 - ss_res / ss_tot
print(f'Test R²: {r2:.6f}')

# ---------- save Keras model ----------
KERAS_PATH = os.path.join(TRAIN_DIR, 'surrogate_model.keras')
print(f'\nSaving Keras model to {KERAS_PATH} ...')
model.save(KERAS_PATH)
print(f'  Saved: {os.path.getsize(KERAS_PATH) / 1e6:.2f} MB')

# ---------- export to TensorFlow.js ----------
print(f'\nExporting to TensorFlow.js format at {MODEL_OUT} ...')
try:
    import tensorflowjs as tfjs
    os.makedirs(MODEL_OUT, exist_ok=True)
    tfjs.converters.save_keras_model(model, MODEL_OUT)

    # Check model size
    total_size = 0
    for f_name in os.listdir(MODEL_OUT):
        fpath = os.path.join(MODEL_OUT, f_name)
        if os.path.isfile(fpath):
            sz = os.path.getsize(fpath)
            total_size += sz
            print(f'  {f_name}: {sz / 1e6:.2f} MB')
    print(f'  Total: {total_size / 1e6:.2f} MB')
    print('\nDone! Model exported for browser inference.')
except ImportError:
    print('  tensorflowjs not installed. Saved Keras model only.')
    print(f'  To convert later: tensorflowjs_converter --input_format keras "{KERAS_PATH}" "{MODEL_OUT}"')
    print('\nDone! Train the model first, then convert to TF.js format.')
