// gzip round-trip via the Web Streams CompressionStream API (FR-174).
// Node 22 and modern browsers expose CompressionStream/DecompressionStream globally.

async function pipeThrough(data: Uint8Array, stream: GenericTransformStream): Promise<ArrayBuffer> {
  const writer = stream.writable.getWriter();
  void writer.write(data);
  void writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.byteLength; }
  return out.buffer;
}

/** Compress UTF-8 text to a gzip ArrayBuffer. */
export async function compressText(text: string): Promise<ArrayBuffer> {
  const bytes = new TextEncoder().encode(text);
  return pipeThrough(bytes, new CompressionStream('gzip'));
}

/** Decompress a gzip ArrayBuffer back to UTF-8 text. */
export async function decompressToText(buf: ArrayBuffer): Promise<string> {
  const out = await pipeThrough(new Uint8Array(buf), new DecompressionStream('gzip'));
  return new TextDecoder().decode(out);
}
