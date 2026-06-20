import { describe, it, expect, afterEach } from 'vitest';
import { getStorageInfo, requestPersistence, formatStorage, LOW_SPACE_BYTES } from '../../src/app/repository/storage';

const realNavigator = globalThis.navigator;
afterEach(() => { Object.defineProperty(globalThis, 'navigator', { value: realNavigator, configurable: true }); });

function mockNavigator(storage: unknown) {
  Object.defineProperty(globalThis, 'navigator', { value: { storage }, configurable: true });
}

describe('getStorageInfo (FR-176/177)', () => {
  it('returns null when navigator.storage.estimate is unavailable', async () => {
    mockNavigator(undefined);
    expect(await getStorageInfo()).toBeNull();
  });

  it('computes available + lowSpace from estimate()', async () => {
    mockNavigator({ estimate: async () => ({ usage: 1_000_000, quota: 2_000_000_000 }) });
    const info = await getStorageInfo();
    expect(info?.available).toBe(2_000_000_000 - 1_000_000);
    expect(info?.lowSpace).toBe(false);
  });

  it('flags lowSpace when remaining < 500 MB', async () => {
    mockNavigator({ estimate: async () => ({ usage: 100, quota: 100 + LOW_SPACE_BYTES - 1 }) });
    expect((await getStorageInfo())?.lowSpace).toBe(true);
  });
});

describe('requestPersistence (FR-175)', () => {
  it('returns false when persist() is unavailable', async () => {
    mockNavigator({});
    expect(await requestPersistence()).toBe(false);
  });
  it('delegates to navigator.storage.persist()', async () => {
    mockNavigator({ persist: async () => true });
    expect(await requestPersistence()).toBe(true);
  });
});

describe('formatStorage (FR-176)', () => {
  it('formats "Using X MB of Y GB available"', () => {
    const s = formatStorage({ usage: 5 * 1024 * 1024, quota: 2 * 1024 * 1024 * 1024, available: 0, lowSpace: false });
    expect(s).toBe('Using 5.0 MB of 2.0 GB available');
  });
});
