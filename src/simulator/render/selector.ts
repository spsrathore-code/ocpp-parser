import type { MessageDef, Profile, Direction } from '../model/types';

const PROFILES: Profile[] = ['Core', 'Firmware Management', 'Local Auth List', 'Reservation', 'Smart Charging', 'Remote Trigger'];
const DIRECTIONS: { value: Direction | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All directions' },
  { value: 'CP_TO_CS', label: 'Charge Point → Central System' },
  { value: 'CS_TO_CP', label: 'Central System → Charge Point' },
  { value: 'BOTH', label: 'Both' },
];

export function renderSelector(mount: HTMLElement, catalog: MessageDef[], onSelect: (action: string) => void): void {
  mount.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <select data-role="profile" class="px-3 py-2 border rounded-md">
        <option value="ALL">All profiles</option>
        ${PROFILES.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
      <select data-role="direction" class="px-3 py-2 border rounded-md">
        ${DIRECTIONS.map(d => `<option value="${d.value}">${d.label}</option>`).join('')}
      </select>
      <select data-role="message" class="px-3 py-2 border rounded-md"></select>
    </div>`;

  const profileSel = mount.querySelector<HTMLSelectElement>('[data-role="profile"]')!;
  const dirSel = mount.querySelector<HTMLSelectElement>('[data-role="direction"]')!;
  const msgSel = mount.querySelector<HTMLSelectElement>('[data-role="message"]')!;

  const repopulate = () => {
    const p = profileSel.value;
    const d = dirSel.value;
    const filtered = catalog.filter(m =>
      (p === 'ALL' || m.profile === p) &&
      (d === 'ALL' || m.direction === d || (d !== 'BOTH' && m.direction === 'BOTH')),
    );
    msgSel.innerHTML = filtered
      .map(m => `<option value="${m.action}">${m.action} (${m.direction === 'CP_TO_CS' ? 'CP→CS' : m.direction === 'CS_TO_CP' ? 'CS→CP' : 'both'})</option>`)
      .join('');
  };

  profileSel.addEventListener('change', repopulate);
  dirSel.addEventListener('change', repopulate);
  msgSel.addEventListener('change', () => { if (msgSel.value) onSelect(msgSel.value); });
  repopulate();
}
