// src/app/repository/autoSave.ts
// Auto-save every successfully-parsed upload to the local repository (FR-179).
// Failure-isolated: a repository error must never interrupt the analysis pipeline.

import { saveLogToRepository } from './repository';
import { requestPersistence } from './storage';

let persistenceRequested = false;

export async function autoSaveUploadedFile(name: string, content: string): Promise<void> {
  try {
    if (!persistenceRequested) { persistenceRequested = true; await requestPersistence(); }
    const fileSize = new TextEncoder().encode(content).byteLength;
    await saveLogToRepository(content, { filename: name, fileSize, source: 'upload' });
  } catch (err) {
    console.warn('Auto-save to repository failed (non-blocking):', err);
  }
}
