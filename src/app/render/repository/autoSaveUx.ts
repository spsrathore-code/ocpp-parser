// src/app/render/repository/autoSaveUx.ts
// Auto-save UX (faithful parity): toast (FR-182), non-blocking site-name banner
// (FR-180), and the duplicate-on-save prompt (FR-357). Wraps the headless save.

import { el } from '../dom';
import { saveLogToRepository, updateEntrySiteName, type DuplicateChoice } from '../../repository/repository';
import { requestPersistence } from '../../repository/storage';
import { refreshRepository } from './panel';

export function detectSiteName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '');
  // Strip a trailing _DD_Month_YYYY_HH:MM_AM/PM timestamp if present.
  const m = base.match(/^(.*?)_\d{1,2}_[A-Za-z]+_\d{4}.*$/);
  return (m ? m[1] : base).trim();
}

export function showToast(message: string): void {
  const toast = el('div', {
    className: 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50',
    attrs: { 'data-repo-toast': '' },
    text: message,
  });
  document.body.append(toast);
  setTimeout(() => toast.remove(), 4000);
}

export function showSiteNameBanner(id: number, filename: string, onSaved: () => void): HTMLElement {
  const input = el('input', {
    className: 'text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
    attrs: { type: 'text', 'data-sitename-input': '' },
  }) as HTMLInputElement;
  input.value = detectSiteName(filename);

  const saveBtn = el('button', {
    className: 'text-sm font-semibold py-1 px-3 rounded bg-blue-600 text-white',
    text: 'Save site',
    attrs: { type: 'button', 'data-sitename-save': '' },
  });
  const dismiss = el('button', {
    className: 'text-sm font-semibold py-1 px-3 rounded bg-gray-300 dark:bg-gray-700',
    text: 'Dismiss',
    attrs: { type: 'button', 'data-sitename-dismiss': '' },
  });

  const banner = el('div', {
    className:
      'fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg p-3 z-50 flex items-center gap-2',
    attrs: { 'data-sitename-banner': '' },
  }, [
    el('span', { className: 'text-sm text-gray-700 dark:text-gray-200', text: `Site for ${filename}:` }),
    input,
    saveBtn,
    dismiss,
  ]);

  const close = () => banner.remove();
  dismiss.addEventListener('click', close);
  saveBtn.addEventListener('click', async () => {
    await updateEntrySiteName(id, input.value.trim());
    onSaved();
    close();
    void refreshRepository();
  });

  document.body.append(banner);
  return banner;
}

export function promptDuplicateChoice(filename: string): Promise<DuplicateChoice> {
  return new Promise((resolve) => {
    const choose = (c: DuplicateChoice) => { modal.remove(); resolve(c); };
    const btn = (label: string, c: DuplicateChoice, cls: string) => {
      const b = el('button', {
        className: `text-sm font-semibold py-2 px-4 rounded-lg ${cls}`,
        text: label,
        attrs: { type: 'button', 'data-dup': c },
      });
      b.addEventListener('click', () => choose(c));
      return b;
    };
    const modal = el('div', {
      className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
      attrs: { 'data-dup-modal': '' },
    }, [
      el('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4' }, [
        el('h3', { className: 'text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100', text: 'Duplicate filename' }),
        el('p', { className: 'text-sm text-gray-600 dark:text-gray-300 mb-4', text: `"${filename}" already exists in the repository.` }),
        el('div', { className: 'flex justify-end gap-2' }, [
          btn('Cancel', 'cancel', 'bg-gray-300 dark:bg-gray-700'),
          btn('Save as new version', 'new-version', 'bg-blue-600 text-white'),
          btn('Overwrite', 'overwrite', 'bg-amber-600 text-white'),
        ]),
      ]),
    ]);
    document.body.append(modal);
  });
}

let persistenceRequested = false;

export async function autoSaveWithUx(name: string, content: string): Promise<void> {
  try {
    if (!persistenceRequested) {
      persistenceRequested = true;
      await requestPersistence();
    }
    const fileSize = new TextEncoder().encode(content).byteLength;
    const saved = await saveLogToRepository(
      content,
      { filename: name, fileSize, source: 'upload' },
      promptDuplicateChoice,
    );
    if (!saved) return; // user cancelled
    await refreshRepository();
    showToast(`✅ Saved to repository: ${saved.filename}`);
    showSiteNameBanner(saved.id, saved.filename, () => {});
  } catch (err) {
    console.warn('Auto-save (UX) failed (non-blocking):', err);
  }
}
