import { describe, it, expect } from 'vitest';
import { cleanSiteName } from '../../src/app/uptime/ingest';

// Sheet names carry boilerplate. Left in place, every comparison column reads
// "DC052 CMS Logs · C1", which is wide enough to push the second site's columns
// — and the Presence and Status columns — off the side of the table, so they
// read as missing entirely.
describe('cleanSiteName', () => {
  it('strips the " CMS Logs" suffix the reference workbook uses', () => {
    expect(cleanSiteName('DC052 CMS Logs')).toBe('DC052');
    expect(cleanSiteName('DC053 CMS Logs')).toBe('DC053');
  });

  it('strips a plain "Logs" suffix', () => {
    expect(cleanSiteName('MH0055 Logs')).toBe('MH0055');
    expect(cleanSiteName('MH0055_log')).toBe('MH0055');
  });

  it('strips the Mahindra "Logs of charger" prefix', () => {
    expect(cleanSiteName('Logs_of_charger__MPCMHDC029_639')).toBe('MPCMHDC029_639');
  });

  it('leaves a clean charger id untouched', () => {
    expect(cleanSiteName('MH0055')).toBe('MH0055');
    expect(cleanSiteName('MPCGJDC052')).toBe('MPCGJDC052');
  });

  it('never returns an empty label, even if the name is all boilerplate', () => {
    expect(cleanSiteName('CMS Logs')).toBe('CMS Logs');
  });
});
