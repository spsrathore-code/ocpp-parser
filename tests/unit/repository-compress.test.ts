import { describe, it, expect } from 'vitest';
import { compressText, decompressToText } from '../../src/app/repository/compress';

describe('gzip compression round-trip (FR-174)', () => {
  it('decompress(compress(text)) === text', async () => {
    const text = 'OCPP log line\n'.repeat(500);
    const buf = await compressText(text);
    expect(buf).toBeInstanceOf(ArrayBuffer);
    expect(await decompressToText(buf)).toBe(text);
  });

  it('compresses repetitive log text smaller than the raw UTF-8 bytes', async () => {
    const text = 'StatusNotification Available\n'.repeat(1000);
    const raw = new TextEncoder().encode(text).byteLength;
    const buf = await compressText(text);
    expect(buf.byteLength).toBeLessThan(raw);
  });

  it('round-trips unicode and empty string', async () => {
    expect(await decompressToText(await compressText(''))).toBe('');
    expect(await decompressToText(await compressText('✅ IST → UTC'))).toBe('✅ IST → UTC');
  });
});
