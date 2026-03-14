import type { OptResults } from '../../types/optimization';

let cached: OptResults | null = null;

export async function loadOptResults(): Promise<OptResults> {
  if (cached) return cached;
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}data/optimization/opt_results.json`);
  if (!res.ok) throw new Error(`Failed to load optimization results: ${res.status}`);
  cached = (await res.json()) as OptResults;
  return cached;
}
