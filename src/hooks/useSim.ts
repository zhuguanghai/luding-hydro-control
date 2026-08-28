import { useSyncExternalStore } from 'react';
import { engine, type SimState } from '../engine/sim';

export function useSim<T>(selector: (s: SimState) => T): T {
  return useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => selector(engine.state),
  );
}

export function useSimState(): SimState {
  return useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.state,
  );
}
