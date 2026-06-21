// App shell — header (title/version + theme & help buttons), the file-upload
// card, and the results mount point. Faithful port of the v2026.05.14 chrome
// (HTML 34-163), trimmed to what Phase 3a needs: the API-download section and
// log-repository panel are Phase 4. Returns live refs so main.ts can wire events.

import { el } from './dom';

export interface ProgressRefs {
  container: HTMLElement;
  bar: HTMLElement;
  text: HTMLElement;
  percent: HTMLElement;
}

export interface ShellRefs {
  fileInput: HTMLInputElement;
  parseBtn: HTMLButtonElement;
  container: HTMLDivElement;
  repoMount: HTMLDivElement;
  progress: ProgressRefs;
}

export function renderShell(root: HTMLElement): ShellRefs {
  // --- Header ---
  const header = el('header', { className: 'text-center mb-8 relative' }, [
    el('h1', { className: 'text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100', text: 'OCPP Client Log Parser' }),
    el('p', { className: 'mt-1 text-sm text-gray-500 dark:text-gray-400', text: 'Modular TypeScript revamp · parity with v2026.05.14' }),
    el('div', { className: 'absolute top-0 right-0 flex gap-2' }, [
      el('button', {
        className: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg',
        text: '🌓 Theme', attrs: { id: 'theme-toggle-btn' },
      }),
      el('button', {
        className: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg',
        text: '❔ Help', attrs: { id: 'help-btn' },
      }),
    ]),
  ]);

  // --- Upload card (HTML 147-157) ---
  const fileInput = el('input', {
    className: 'block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300 cursor-pointer',
    attrs: { type: 'file', id: 'log-file-input', accept: '.txt,.log', multiple: '' },
  });

  const parseBtn = el('button', {
    className: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
    text: 'Parse Files', attrs: { id: 'parse-log-btn', disabled: '' },
  });

  // Enable parse only when files are chosen (HTML behaviour).
  fileInput.addEventListener('change', () => {
    parseBtn.disabled = !(fileInput.files && fileInput.files.length > 0);
  });

  const uploadCard = el('section', { className: 'mb-8' }, [
    el('div', { className: 'max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700' }, [
      el('h2', { className: 'text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4', text: '📂 Upload Log Files' }),
      el('p', { className: 'text-sm text-gray-600 dark:text-gray-400 mb-4', text: 'Select one or more OCPP client log files (.txt or .log). Files are processed sequentially.' }),
      el('div', { className: 'flex items-center space-x-4' }, [fileInput, parseBtn]),
    ]),
  ]);

  const container = el('div', { attrs: { id: 'parsed-data-container' } });

  // Log Repository panel mount (Phase 4b, FR-184) — sits above the upload card.
  const repoMount = el('div', { attrs: { id: 'log-repository-mount' } });

  // Chunked-parse progress (hidden until parsing) — faithful to the legacy
  // "Processing in chunks to prevent browser crashes…" bar (HTML 166-175).
  const progressBar = el('div', { className: 'bg-blue-600 h-3 rounded-full transition-all duration-150', attrs: { style: 'width:0%', id: 'progress-bar' } });
  const progressText = el('span', { className: 'text-sm text-gray-600 dark:text-gray-400', text: 'Processing…', attrs: { id: 'progress-text' } });
  const progressPercent = el('span', { className: 'text-sm font-semibold text-gray-700 dark:text-gray-300', text: '0%', attrs: { id: 'progress-percent' } });
  const progressContainer = el('section', { className: 'mb-8 hidden', attrs: { id: 'progress-container' } }, [
    el('div', { className: 'max-w-3xl mx-auto bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700' }, [
      el('div', { className: 'flex justify-between items-center mb-2' }, [progressText, progressPercent]),
      el('div', { className: 'w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden' }, [progressBar]),
    ]),
  ]);

  root.append(header, repoMount, uploadCard, progressContainer, container);
  return {
    fileInput, parseBtn, container, repoMount,
    progress: { container: progressContainer, bar: progressBar, text: progressText, percent: progressPercent },
  };
}
