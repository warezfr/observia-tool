import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Provide a minimal localStorage if the environment doesn't expose one.
function createLocalStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

if (typeof globalThis.localStorage === 'undefined' || globalThis.localStorage === null) {
  const ls = createLocalStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: ls, configurable: true });
  }
}

// jsdom doesn't implement ResizeObserver, which recharts relies on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error - assign stub for tests
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub;

// jsdom doesn't implement object URLs used by download helpers.
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => 'blob:mock';
}
if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = () => {};
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
