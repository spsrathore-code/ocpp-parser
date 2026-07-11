import type { FieldDef } from '../model/types';

function control(f: FieldDef): string {
  const req = f.required ? ' *' : '';
  const label = `<label class="block text-sm font-medium mb-1">${f.name}${req}</label>`;
  const help = f.description ? `<p class="text-xs text-gray-500 mt-1">${f.description}</p>` : '';
  const ctl = 'block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100';
  let input: string;
  if (f.type === 'enum') {
    input = `<select name="${f.name}" class="${ctl}">
      ${(f.enumValues ?? []).map(v => `<option value="${v}">${v}</option>`).join('')}
    </select>`;
  } else if (f.type === 'json') {
    input = `<textarea name="${f.name}" rows="6" class="${ctl} font-mono text-xs">${f.default ?? '{}'}</textarea>`;
  } else {
    const inputType = f.type === 'integer' || f.type === 'number' ? 'number' : 'text';
    input = `<input type="${inputType}" name="${f.name}" value="${f.default ?? ''}" class="${ctl}" />`;
  }
  return `<div class="mb-3">${label}${input}${help}</div>`;
}

export function renderParamForm(mount: HTMLElement, fields: FieldDef[]): void {
  mount.innerHTML = fields.length
    ? `<form data-role="params">${fields.map(control).join('')}</form>`
    : `<p class="text-sm text-gray-500">No parameters for this message.</p>`;
}

export function readForm(mount: HTMLElement, fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const el = mount.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${f.name}"]`);
    if (!el) continue;
    const raw = el.value?.trim() ?? '';
    if (raw === '') continue; // omit empty (optional) fields
    if (f.type === 'integer') out[f.name] = parseInt(raw, 10);
    else if (f.type === 'number') out[f.name] = Number(raw);
    else if (f.type === 'boolean') out[f.name] = raw === 'true';
    else if (f.type === 'json') { try { out[f.name] = JSON.parse(raw); } catch { out[f.name] = { error: 'Invalid JSON' }; } }
    else out[f.name] = raw;
  }
  return out;
}
