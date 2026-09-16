// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { NAV_GROUPS } from '../../src/app/nav/navConfig';
import { renderUptimeShell } from '../../src/app/uptime/render/renderUptimeShell';
import { renderSiteUptime } from '../../src/app/uptime/render/renderSiteUptime';
import { computeSiteUptime } from '../../src/app/uptime/uptimeCalc';
import { extractRows } from '../../src/app/uptime/extract';
import { DEFAULT_UPTIME_OPTIONS } from '../../src/app/uptime/types';
import type { CmsRow } from '../../src/app/cms/types';

describe('nav wiring', () => {
  it('exposes Uptime as a top-level group beside CMS', () => {
    const group = NAV_GROUPS.find((g) => g.id === 'uptime');
    expect(group?.label).toBe('Uptime');
    expect(group?.views[0]).toMatchObject({ id: 'uptime-analysis', enabled: true });
    expect(typeof group?.views[0].mount).toBe('function');
  });
});

describe('shell', () => {
  it('renders the upload control, customer selector and threshold inputs', () => {
    const host = document.createElement('div');
    const shell = renderUptimeShell(host);
    expect(shell.fileInput.accept).toContain('.csv');
    expect(shell.fileInput.multiple).toBe(true);
    expect(shell.fileInputB).toBeTruthy(); // Site B slot, optional
    expect(shell.clusteringInput.value).toBe('300');
    expect(shell.categoriesInput.value).toBe('PowerFailure, Offline, EmergencyPressed, InputUnderVoltage');
    // Auto-detect plus every registered customer, xlsx and csv alike.
    expect(shell.customerSelect.options.length).toBeGreaterThan(2);
    expect(shell.customerSelect.options[0].value).toBe('');
  });
});

describe('site rendering', () => {
  const T0 = Date.parse('2026-08-11T00:00:00Z');
  const iso = (sec: number): string => new Date(T0 + sec * 1000).toISOString();
  const row = (request: string, response = ''): CmsRow =>
    ({ requestString: request, responseString: response, requestTime: '', responseTime: '', sheetName: 'DC052' });

  const site = computeSiteUptime('DC052', extractRows([
    row('[2,"h1","Heartbeat",{}]', `[3,"h1",{"currentTime":"${iso(0)}"}]`),
    row(`[2,"s1","StatusNotification",{"connectorId":1,"status":"Faulted","errorCode":"OtherError","vendorErrorCode":"17","info":"EmergencyPressed","timestamp":"${iso(100)}"}]`),
    row(`[2,"s2","StatusNotification",{"connectorId":1,"status":"Available","errorCode":"NoError","timestamp":"${iso(400)}"}]`),
    row(`[2,"s3","StatusNotification",{"connectorId":2,"status":"Available","errorCode":"NoError","timestamp":"${iso(500)}"}]`),
    row('[2,"h2","Heartbeat",{}]', `[3,"h2",{"currentTime":"${iso(1000)}"}]`),
  ]), DEFAULT_UPTIME_OPTIONS);

  const html = renderSiteUptime(site, DEFAULT_UPTIME_OPTIONS);

  it('shows the site name and the headline overlap-adjusted uptime', () => {
    expect(html).toContain('DC052');
    expect(html).toContain('site uptime (overlap-adjusted)');
  });

  it('states which categories were counted, so a figure is never read without its scope', () => {
    expect(html).toContain('EmergencyPressed');
    expect(html).toContain('not subtracted');
  });

  it('renders both summary blocks and the outage drill-down', () => {
    expect(html).toContain('Downtime by Error Code');
    expect(html).toContain('Downtime by Error Description');
    expect(html).toContain('Outage detail');
  });

  it('escapes fault text rather than injecting it as markup', () => {
    const nasty = computeSiteUptime('X', extractRows([
      row(`[2,"s1","StatusNotification",{"connectorId":1,"status":"Faulted","errorCode":"OtherError","info":"<img src=x onerror=alert(1)>","timestamp":"${iso(10)}"}]`),
    ]), DEFAULT_UPTIME_OPTIONS);
    const out = renderSiteUptime(nasty, DEFAULT_UPTIME_OPTIONS);
    expect(out).not.toContain('<img src=x');
    expect(out).toContain('&lt;img src=x');
  });
});
