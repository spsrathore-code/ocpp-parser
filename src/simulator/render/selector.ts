import type { MessageDef, Profile, Direction } from '../model/types';

const PROFILES: Profile[] = ['Core', 'Firmware Management', 'Local Auth List', 'Reservation', 'Smart Charging', 'Remote Trigger'];

const PROFILE_BLURB: Record<Profile, string> = {
  'Core': 'Everyday charging: boot, authorize, transactions, meter values, status, and the central-system controls (reset, availability, remote start/stop).',
  'Firmware Management': 'Remote firmware updates and diagnostics upload, with their progress-notification messages.',
  'Local Auth List': 'Manage the charge point’s on-board authorization list (version + full/differential updates).',
  'Reservation': 'Reserve a connector for an idTag and cancel reservations.',
  'Smart Charging': 'Send, clear, and query charging profiles that shape power/current over time.',
  'Remote Trigger': 'Ask the charge point to send a specific message on demand (TriggerMessage).',
};
const DIRECTIONS: { value: Direction | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All directions' },
  { value: 'CP_TO_CS', label: 'CP → CS' },
  { value: 'CS_TO_CP', label: 'CS → CP' },
  { value: 'BOTH', label: 'Both directions' },
];

const CTL = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100';

export function renderSelector(mount: HTMLElement, catalog: MessageDef[], onSelect: (action: string) => void): void {
  mount.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <select data-role="profile" class="${CTL}">
        <option value="ALL">All profiles</option>
        ${PROFILES.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
      <select data-role="direction" class="${CTL}">
        ${DIRECTIONS.map(d => `<option value="${d.value}">${d.label}</option>`).join('')}
      </select>
    </div>
    <select data-role="message" class="${CTL} mt-3"></select>
    <p data-role="profile-blurb" class="text-xs text-gray-500 mt-2"></p>`;

  const profileSel = mount.querySelector<HTMLSelectElement>('[data-role="profile"]')!;
  const dirSel = mount.querySelector<HTMLSelectElement>('[data-role="direction"]')!;
  const msgSel = mount.querySelector<HTMLSelectElement>('[data-role="message"]')!;
  const blurbEl = mount.querySelector<HTMLElement>('[data-role="profile-blurb"]')!;

  const repopulate = () => {
    const p = profileSel.value;
    const d = dirSel.value;
    blurbEl.textContent = p === 'ALL' ? '' : (PROFILE_BLURB[p as Profile] ?? '');
    const filtered = catalog.filter(m =>
      (p === 'ALL' || m.profile === p) &&
      (d === 'ALL' || m.direction === d || (d !== 'BOTH' && m.direction === 'BOTH')),
    );
    msgSel.innerHTML = filtered
      .map(m => {
        const dir = m.direction === 'CP_TO_CS' ? 'CP→CS' : m.direction === 'CS_TO_CP' ? 'CS→CP' : 'both';
        const label = `${m.action} (${dir})`;
        return `<option value="${m.action}" title="${label}">${label}</option>`;
      })
      .join('');
  };

  profileSel.addEventListener('change', repopulate);
  dirSel.addEventListener('change', repopulate);
  msgSel.addEventListener('change', () => { if (msgSel.value) onSelect(msgSel.value); });
  repopulate();
}
