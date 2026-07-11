// src/app/repository/repository.ts
// High-level Log Repository service (local only; Drive sync parked to Phase 5).
// Compresses on save, decompresses on load, and resolves duplicate filenames via
// an injected callback (FR-183). UI prompts live in Phase 4b; the service is headless.

import { compressText, decompressToText } from './compress';
import { putEntry, getEntry, getAllMeta, findByFilename, deleteEntry, patchEntry } from './db';
import type { RepoEntry, RepoMeta, SaveInput } from './types';

export type DuplicateChoice = 'overwrite' | 'new-version' | 'cancel';

/** Append `_v2`, `_v3`… before the extension until the name is unique. */
export function nextVersionFilename(filename: string, existing: string[]): string {
  const taken = new Set(existing);
  const dot = filename.lastIndexOf('.');
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : '';
  let n = 2;
  let candidate = `${base}_v${n}${ext}`;
  while (taken.has(candidate)) { n += 1; candidate = `${base}_v${n}${ext}`; }
  return candidate;
}

/**
 * Save raw log text. Compresses content, fills schema defaults, and on a filename
 * collision asks `onDuplicate` (default: silently version as `_v2`). Returns the
 * saved id + final filename, or `null` if cancelled.
 */
export async function saveLogToRepository(
  content: string,
  input: SaveInput,
  onDuplicate: (filename: string) => Promise<DuplicateChoice> | DuplicateChoice = () => 'new-version',
): Promise<{ id: number; filename: string } | null> {
  const collisions = await findByFilename(input.filename);
  let filename = input.filename;
  let overwriteId: number | undefined;

  if (collisions.length > 0) {
    const choice = await onDuplicate(input.filename);
    if (choice === 'cancel') return null;
    if (choice === 'overwrite') {
      overwriteId = collisions[0].id;
    } else {
      const all = (await getAllMeta()).map((m) => m.filename);
      filename = nextVersionFilename(input.filename, all);
    }
  }

  const entry: RepoEntry = {
    ...(overwriteId !== undefined ? { id: overwriteId } : {}),
    filename,
    savedAt: Date.now(),
    fileSize: input.fileSize,
    evseIp: input.evseIp ?? '',
    siteName: input.siteName ?? '',
    tags: input.tags ?? [],
    driveFileId: null,
    source: input.source ?? 'upload',
    content: await compressText(content),
  };
  const id = await putEntry(entry);
  return { id, filename };
}

/** Read + decompress one entry by id. */
export async function loadFromRepo(id: number): Promise<{ meta: RepoMeta; content: string } | undefined> {
  const entry = await getEntry(id);
  if (!entry) return undefined;
  const { content, ...meta } = entry;
  return { meta, content: await decompressToText(content) };
}

export function deleteFromRepo(id: number): Promise<void> {
  return deleteEntry(id);
}

/** All stored metadata, newest first. */
export async function listRepoMeta(): Promise<RepoMeta[]> {
  return (await getAllMeta()).sort((a, b) => b.savedAt - a.savedAt);
}

/** Replace an entry's tags in place (content untouched). */
export function updateEntryTags(id: number, tags: string[]): Promise<void> {
  return patchEntry(id, (e) => ({ ...e, tags }));
}

/** Replace an entry's siteName in place (content untouched). */
export function updateEntrySiteName(id: number, siteName: string): Promise<void> {
  return patchEntry(id, (e) => ({ ...e, siteName }));
}
