// src/app/render/repository/tagEditor.ts
// Tag editor modal (FR-356/193/194): 7 preset toggle-chips + free-text custom tag.

import { el } from '../dom';

export const PRESET_TAGS = [
  'Power Failure',
  'CMS Issue',
  'Phantom Connection',
  'Zero Energy',
  'Emergency Stop',
  'EV Compatibility',
  'Normal',
] as const;

export function openTagEditor(
  id: number,
  currentTags: string[],
  onSave: (tags: string[]) => void | Promise<void>,
): HTMLElement {
  const selected = new Set(currentTags);

  const chip = (label: string): HTMLButtonElement => {
    const isOn = () => selected.has(label);
    const b = el('button', {
      attrs: { type: 'button', 'data-tag-chip': label },
      text: label,
    }) as HTMLButtonElement;
    const paint = () => {
      b.className = `text-xs px-2 py-1 rounded-full border ${
        isOn()
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200'
      }`;
    };
    b.addEventListener('click', () => {
      isOn() ? selected.delete(label) : selected.add(label);
      paint();
    });
    paint();
    return b;
  };

  const presetRow = el('div', { className: 'flex flex-wrap gap-2 mb-3' }, PRESET_TAGS.map(chip));

  const custom = el('input', {
    className:
      'text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
    attrs: { type: 'text', placeholder: 'Custom tag…', 'data-tag-custom': '' },
  }) as HTMLInputElement;

  const addBtn = el('button', {
    className: 'text-xs font-semibold py-1 px-3 rounded bg-gray-200 dark:bg-gray-700',
    text: 'Add',
    attrs: { type: 'button', 'data-tag-add': '' },
  });
  addBtn.addEventListener('click', () => {
    const v = custom.value.trim();
    if (v) {
      selected.add(v);
      presetRow.append(chip(v));
      custom.value = '';
    }
  });

  const saveBtn = el('button', {
    className: 'text-sm font-semibold py-2 px-4 rounded-lg bg-blue-600 text-white',
    text: 'Save',
    attrs: { type: 'button', 'data-tag-save': '' },
  });
  const cancelBtn = el('button', {
    className: 'text-sm font-semibold py-2 px-4 rounded-lg bg-gray-300 dark:bg-gray-700',
    text: 'Cancel',
    attrs: { type: 'button', 'data-tag-cancel': '' },
  });

  const modal = el(
    'div',
    {
      className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
      attrs: { 'data-tag-modal': String(id) },
    },
    [
      el('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4' }, [
        el('h3', {
          className: 'text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100',
          text: 'Edit Tags',
        }),
        presetRow,
        el('div', { className: 'flex gap-2 mb-4' }, [custom, addBtn]),
        el('div', { className: 'flex justify-end gap-2' }, [cancelBtn, saveBtn]),
      ]),
    ],
  );

  const close = () => modal.remove();
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  saveBtn.addEventListener('click', async () => {
    await onSave([...selected]);
    close();
  });

  document.body.append(modal);
  return modal;
}
