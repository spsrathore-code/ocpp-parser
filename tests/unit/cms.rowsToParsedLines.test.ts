import { describe, it, expect } from 'vitest';
import { cmsRowsToParsedLines } from '../../src/app/cms/rowsToParsedLines';
import { correlateMessages } from '../../src/app/parse/correlate';
import type { CmsRow } from '../../src/app/cms/types';

const heartbeatRow: CmsRow = {
  srNo: '1593',
  requestString: '[2,"uuid-hb","Heartbeat",{}]',
  responseString: '[3,"uuid-hb",{"currentTime":"2025-08-07T18:32:42.764Z"}]',
  requestTime: '08/08/2025, 00:02:42',
  responseTime: '08/08/2025, 00:02:42',
  sheetName: 'MH0055',
};

describe('cmsRowsToParsedLines', () => {
  it('emits a CALL and its CALLRESULT that correlate by msgId', () => {
    const { messages } = cmsRowsToParsedLines([heartbeatRow], 'CZ.xlsx');
    expect(messages).toHaveLength(2);
    const [req, resp] = messages;
    expect(req.message[0]).toBe(2);
    expect(req.message[2]).toBe('Heartbeat');
    expect(resp.message[0]).toBe(3);

    const correlated = correlateMessages(messages);
    expect(correlated).toHaveLength(1);
    expect(correlated[0].responsePayload).toMatchObject({ currentTime: '2025-08-07T18:32:42.764Z' });
  });

  it('stores UTC-ISO timestamps and CP-initiated direction', () => {
    const { messages } = cmsRowsToParsedLines([heartbeatRow], 'CZ.xlsx');
    expect(messages[0].timestamp).toBe('2025-08-07T18:32:42.000Z');
    expect(messages[0].direction).toBe('sent'); // Heartbeat is CP-initiated
    expect(messages[1].direction).toBe('received');
  });

  it('synthesizes one raw text line per message, with matching lineNumbers', () => {
    const { messages, rawLogLines } = cmsRowsToParsedLines([heartbeatRow], 'CZ.xlsx');
    expect(rawLogLines).toHaveLength(2);
    expect(rawLogLines[messages[0].lineNumber - 1]).toContain('[2,"uuid-hb","Heartbeat"');
    expect(rawLogLines[messages[1].lineNumber - 1]).toContain('currentTime');
  });

  it('derives an Alert from a StatusNotification with a real errorCode', () => {
    const faultRow: CmsRow = {
      requestString: '[2,"uuid-sn","StatusNotification",{"connectorId":1,"errorCode":"GroundFailure","status":"Faulted","info":"BMS Communication Timeout"}]',
      responseString: '[3,"uuid-sn",{}]',
      requestTime: '08/08/2025, 01:00:00',
      responseTime: '08/08/2025, 01:00:00',
      sheetName: 'MH0055',
    };
    const { alerts } = cmsRowsToParsedLines([faultRow], 'CZ.xlsx');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ code: 'GroundFailure', chargerId: 'MH0055' });
  });

  it('does NOT derive an Alert when errorCode is NoError', () => {
    const okRow: CmsRow = { ...heartbeatRow, requestString: '[2,"x","StatusNotification",{"connectorId":1,"errorCode":"NoError","status":"Available"}]', responseString: '[3,"x",{}]' };
    const { alerts } = cmsRowsToParsedLines([okRow], 'CZ.xlsx');
    expect(alerts).toHaveLength(0);
  });

  it('emits only the request when the response string is empty', () => {
    const noResp: CmsRow = { ...heartbeatRow, responseString: '', responseTime: '' };
    const { messages } = cmsRowsToParsedLines([noResp], 'CZ.xlsx');
    expect(messages).toHaveLength(1);
    expect(correlateMessages(messages)[0].responsePayload).toBeNull();
  });

  it('skips rows whose request string is not a valid CALL', () => {
    const junk: CmsRow = { ...heartbeatRow, requestString: 'not json' };
    const { messages } = cmsRowsToParsedLines([junk], 'CZ.xlsx');
    expect(messages).toHaveLength(0);
  });
});
