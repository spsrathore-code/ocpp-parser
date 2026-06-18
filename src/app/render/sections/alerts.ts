// Alerts section — faithful port of HTML 2879-3043 (table + Outlet/Code/Message
// column filters). The per-row "Download Context" button is deferred to the
// context-viewer sub-phase, so the trailing "Context Analysis" column is omitted
// here. Missing fields render 'N/A'. Filtering is immediate (legacy 150 ms debounce
// dropped for simplicity/testability).

import { el } from '../dom';
import type { AnalysisResult } from '../../analyze';

const TH = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-700 z-10';
const TH_SNO = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 top-0 bg-gray-50 dark:bg-gray-700 z-20';
const TD = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100';
const TD_SNO = 'px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10';
const FILTER = 'w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500';

export function renderAlerts(r: AnalysisResult): HTMLElement {
  const alerts = r.alerts;
  const outletFilter = el('input', { className: FILTER, attrs: { type: 'text', placeholder: 'Filter...' } });
  const codeFilter = el('input', { className: FILTER, attrs: { type: 'text', placeholder: 'Filter...' } });
  const messageFilter = el('input', { className: FILTER, attrs: { type: 'text', placeholder: 'Filter...' } });

  const tbody = el('tbody', { className: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700' },
    alerts.map((al, i) =>
      el('tr', {
        attrs: {
          'data-outlet': String(al.outlet ?? '').toLowerCase(),
          'data-code': String(al.code ?? '').toLowerCase(),
          'data-message': String(al.message ?? '').toLowerCase(),
        },
      }, [
        el('td', { className: TD_SNO, text: String(i + 1) }),
        el('td', { className: TD, text: al.fileName || 'N/A', attrs: { title: al.fileName || 'N/A' } }),
        el('td', { className: TD, text: al.timestamp }),
        el('td', { className: TD, text: al.chargerId ?? 'N/A' }),
        el('td', { className: TD, text: al.outlet ?? 'N/A' }),
        el('td', { className: TD, text: al.code ?? 'N/A' }),
        el('td', { className: 'px-6 py-4 text-sm text-gray-900 dark:text-gray-100 break-words max-w-md', text: al.message, attrs: { title: al.message } }),
        el('td', { className: TD, text: al.session ?? 'N/A' }),
      ])));

  const countLabel = el('span', { className: 'text-xs text-gray-400 dark:text-gray-500' });
  const applyFilter = (): void => {
    const o = outletFilter.value.toLowerCase().trim();
    const c = codeFilter.value.toLowerCase().trim();
    const m = messageFilter.value.toLowerCase().trim();
    let visible = 0;
    tbody.querySelectorAll('tr').forEach((row) => {
      const d = (row as HTMLElement).dataset;
      const show = (d.outlet ?? '').includes(o) && (d.code ?? '').includes(c) && (d.message ?? '').includes(m);
      (row as HTMLElement).style.display = show ? '' : 'none';
      if (show) visible++;
    });
    countLabel.textContent = o || c || m ? `${visible} of ${alerts.length} shown` : '';
  };
  outletFilter.addEventListener('input', applyFilter);
  codeFilter.addEventListener('input', applyFilter);
  messageFilter.addEventListener('input', applyFilter);

  const table = el('table', { className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700', attrs: { id: 'alerts-table' } }, [
    el('thead', { className: 'bg-gray-50 dark:bg-gray-700' }, [
      el('tr', {}, [
        el('th', { className: TH_SNO, text: 'S.No.' }),
        el('th', { className: TH, text: 'File Name' }),
        el('th', { className: TH, text: 'Time Stamp' }),
        el('th', { className: TH, text: 'Charger ID' }),
        el('th', { className: TH }, [el('div', { className: 'mb-1', text: 'Outlet' }), outletFilter]),
        el('th', { className: TH }, [el('div', { className: 'mb-1', text: 'Code' }), codeFilter]),
        el('th', { className: TH }, [el('div', { className: 'mb-1', text: 'Message' }), messageFilter]),
        el('th', { className: TH, text: 'Session' }),
      ]),
    ]),
    tbody,
  ]);

  return el('div', {}, [el('div', { className: 'mb-2' }, [countLabel]), el('div', { className: 'overflow-auto max-h-[500px]' }, [table])]);
}
