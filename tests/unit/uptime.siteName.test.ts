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

import { siteLabel } from '../../src/app/uptime/ingest';

// When the sheet name identifies nothing, the file name does. Two chargers both
// exported as "Sheet1" are indistinguishable in a comparison table — and used
// to collapse into a single site.
describe('siteLabel', () => {
  it('prefers the sheet name when it names the charger', () => {
    expect(siteLabel('DC052 CMS Logs', 'august-export.xlsx')).toBe('DC052');
    expect(siteLabel('MPCMHDC029_639', 'export.xlsx')).toBe('MPCMHDC029_639');
  });

  it('falls back to the file name for a generic sheet name', () => {
    expect(siteLabel('Sheet1', 'DC052.xlsx')).toBe('DC052');
    expect(siteLabel('Sheet', 'charger-A.xlsx')).toBe('charger-A');
    expect(siteLabel('Data', 'MH0055 August.xlsx')).toBe('MH0055 August');
  });

  it('drops the file extension', () => {
    expect(siteLabel('Sheet1', 'DC053.CSV')).toBe('DC053');
  });

  it('never returns empty', () => {
    expect(siteLabel('Sheet1', '')).toBe('Sheet1');
  });
});
