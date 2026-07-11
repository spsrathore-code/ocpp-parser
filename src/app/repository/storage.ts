// Thin guards over navigator.storage for quota display + persistence (FR-175/176/177).
// All methods degrade gracefully when the Storage API is absent (e.g. older browsers).

export interface StorageInfo {
  usage: number;
  quota: number;
  available: number;
  lowSpace: boolean;
}

export const LOW_SPACE_BYTES = 500 * 1024 * 1024; // 500 MB (FR-177)

export async function getStorageInfo(): Promise<StorageInfo | null> {
  const storage = (globalThis.navigator as Navigator | undefined)?.storage;
  if (!storage || typeof storage.estimate !== 'function') return null;
  const { usage = 0, quota = 0 } = await storage.estimate();
  const available = Math.max(0, quota - usage);
  return { usage, quota, available, lowSpace: available < LOW_SPACE_BYTES };
}

export async function requestPersistence(): Promise<boolean> {
  const storage = (globalThis.navigator as Navigator | undefined)?.storage;
  if (!storage || typeof storage.persist !== 'function') return false;
  return storage.persist();
}

export function formatStorage(info: StorageInfo): string {
  const mb = (info.usage / (1024 * 1024)).toFixed(1);
  const gb = (info.quota / (1024 * 1024 * 1024)).toFixed(1);
  return `Using ${mb} MB of ${gb} GB available`;
}
