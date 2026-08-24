// CMS Log Parser view shell — the upload card + results mount for Excel CMS logs.
//
// Deliberately leaner than the Client shell (render/shell.ts): CMS logs are
// customer Excel or CSV exports, so it accepts .xlsx/.xls/.csv, has no IndexedDB
// Log Repository panel (a controller-log feature), and shows a source-info line
// (customer / charger / rows) once a file is parsed. Global theme toggle lives
// in the nav bar.

import { el } from '../render/dom';
import { CMS_ADAPTERS } from './registry';

export interface CmsProgressRefs {
  container: HTMLElement;
  text: HTMLElement;
}

export interface CmsShellRefs {
  fileInput: HTMLInputElement;
  parseBtn: HTMLButtonElement;
  customerSelect: HTMLSelectElement;
  container: HTMLDivElement;
  sourceInfo: HTMLDivElement;
  progress: CmsProgressRefs;
}

export function renderCmsShell(root: HTMLElement): CmsShellRefs {
  const header = el('header', { className: 'text-center mb-8' }, [
    el('h1', { className: 'text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100', text: 'CMS Log Parser' }),
    el('p', { className: 'mt-1 text-sm text-gray-500 dark:text-gray-400', text: 'Central-system OCPP logs from Excel · same analysis as the Client Log Parser' }),
  ]);

  const fileInput = el('input', {
    className: 'block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300 cursor-pointer',
    attrs: { type: 'file', id: 'cms-log-file-input', accept: '.xlsx,.xls,.csv', multiple: '' },
  });

  const parseBtn = el('button', {
    className: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
    text: 'Parse & Analyze', attrs: { id: 'cms-parse-btn', disabled: '' },
  });

  fileInput.addEventListener('change', () => {
    parseBtn.disabled = !(fileInput.files && fileInput.files.length > 0);
  });

  // Customer selector — options are generated from the adapter registry, so adding
  // a new customer adapter surfaces its option here with zero UI changes.
  // Auto-detect (empty value) is the default; a specific choice forces that adapter.
  const customerSelect = el('select', {
    className: 'text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500',
    attrs: { id: 'cms-customer-select' },
  }) as HTMLSelectElement;
  customerSelect.appendChild(el('option', { text: 'Auto-detect', attrs: { value: '' } }));
  for (const a of CMS_ADAPTERS) {
    customerSelect.appendChild(el('option', { text: a.label, attrs: { value: a.id } }));
  }

  const uploadCard = el('section', { className: 'mb-8' }, [
    el('div', { className: 'max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700' }, [
      el('h2', { className: 'text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4', text: '📊 Upload CMS Log (Excel)' }),
      el('p', { className: 'text-sm text-gray-600 dark:text-gray-400 mb-4', text: 'Select one or more CMS log files (.xlsx). Choose the customer, or leave on Auto-detect.' }),
      el('div', { className: 'flex items-center gap-4 flex-wrap' }, [
        el('label', { className: 'text-sm font-medium text-gray-700 dark:text-gray-300', text: 'Customer:', attrs: { for: 'cms-customer-select' } }),
        customerSelect,
        fileInput,
        parseBtn,
      ]),
    ]),
  ]);

  // Indeterminate "analyzing" indicator (xlsx read is atomic, not line-chunked).
  const progressText = el('span', { className: 'text-sm text-gray-600 dark:text-gray-400', text: 'Analyzing…', attrs: { id: 'cms-progress-text' } });
  const progressContainer = el('section', { className: 'mb-8 hidden', attrs: { id: 'cms-progress-container' } }, [
    el('div', { className: 'max-w-3xl mx-auto bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 flex items-center gap-3' }, [
      el('div', { className: 'animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full' }),
      progressText,
    ]),
  ]);

  // Source-info banner (customer / charger / rows) — populated after a parse.
  const sourceInfo = el('div', { className: 'max-w-3xl mx-auto mb-6 hidden', attrs: { id: 'cms-source-info' } });

  const container = el('div', { attrs: { id: 'cms-parsed-data-container' } });

  root.append(header, uploadCard, progressContainer, sourceInfo, container);
  return {
    fileInput, parseBtn, customerSelect, container, sourceInfo,
    progress: { container: progressContainer, text: progressText },
  };
}
