import { describe, it, expect } from 'vitest';
import { mergeCmsParsed } from '../../src/app/cms/mergeCmsParsed';
import { cmsRowsToParsedLines } from '../../src/app/cms/rowsToParsedLines';
import type { CmsRow } from '../../src/app/cms/types';

function rows(id: string): CmsRow[] {
  return [{
    requestString: `[2,"${id}","StatusNotification",{"connectorId":1,"errorCode":"GroundFailure","status":"Faulted"}]`,
    responseString: `[3,"${id}",{}]`,
    requestTime: '08/08/2025, 00:02:42',
    responseTime: '08/08/2025, 00:02:42',
    sheetName: 'CHG',
  }];
}

describe('mergeCmsParsed', () => {
  const a = cmsRowsToParsedLines(rows('a'), 'A.xlsx'); // 2 messages, 2 raw lines
  const b = cmsRowsToParsedLines(rows('b'), 'B.xlsx');
  const merged = mergeCmsParsed([a, b]);

  it('concatenates messages and raw log lines', () => {
    expect(merged.parsed.messages).toHaveLength(4);
    expect(merged.rawLogLines).toHaveLength(4);
  });

  it("offsets the later file's lineNumbers into the concatenated rawLogLines", () => {
    // file B's first message pointed at line 1 of its own 2-line block -> now line 3.
    expect(merged.parsed.messages[2].lineNumber).toBe(3);
    expect(merged.rawLogLines[merged.parsed.messages[2].lineNumber - 1]).toContain('"b"');
  });

  it('offsets alert lineNumbers too', () => {
    expect(merged.parsed.alerts).toHaveLength(2);
    const alertB = merged.parsed.alerts[1];
    expect(merged.rawLogLines[alertB.lineNumber - 1]).toContain('"b"');
  });
});
