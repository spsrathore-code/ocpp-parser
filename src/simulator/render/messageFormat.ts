import type { FieldDef } from '../model/types';

function fieldRows(fields: FieldDef[]): string {
  if (!fields.length) return '<p class="text-sm text-gray-500 dark:text-gray-400">No fields.</p>';
  return fields.map(f => `
    <div class="flex justify-between items-center border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 mb-1">
      <span class="text-sm">
        <span class="font-semibold ${f.required ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}">${f.name}</span>
        <span class="text-xs text-gray-500 dark:text-gray-400">(${f.required ? 'required' : 'optional'})</span>
      </span>
      <span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded">${f.type}</span>
    </div>`).join('');
}

/** Faithful port of the original "Message Format" panel: Request + Response field tables. */
export function renderMessageFormat(request: FieldDef[], response: FieldDef[]): string {
  return `
    <h4 class="font-medium mt-1 mb-1 text-gray-700 dark:text-gray-300">Request Format</h4>
    ${fieldRows(request)}
    <h4 class="font-medium mt-4 mb-1 text-gray-700 dark:text-gray-300">Response Format</h4>
    ${fieldRows(response)}`;
}
