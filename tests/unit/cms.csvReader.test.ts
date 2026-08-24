import { describe, it, expect } from 'vitest';
import { readCsvRows } from '../../src/app/cms/csvReader';

describe('readCsvRows', () => {
  it('parses plain rows', () => {
    expect(readCsvRows('a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('keeps commas inside quoted fields', () => {
    expect(readCsvRows('a,b\n"x,y",2\n')).toEqual([['a', 'b'], ['x,y', '2']]);
  });

  it('unescapes doubled quotes — OCPP JSON depends on this', () => {
    const line = 'Request\n"[2,""id"",""Heartbeat"",{}]"\n';
    expect(readCsvRows(line)).toEqual([['Request'], ['[2,"id","Heartbeat",{}]']]);
  });

  it('keeps newlines inside quoted fields', () => {
    expect(readCsvRows('a\n"line1\nline2"\n')).toEqual([['a'], ['line1\nline2']]);
  });

  it('handles CRLF and a trailing row without a newline', () => {
    expect(readCsvRows('a,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('strips a UTF-8 BOM', () => {
    expect(readCsvRows('﻿a,b\n')).toEqual([['a', 'b']]);
  });

  it('ignores blank lines', () => {
    expect(readCsvRows('a,b\n\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('treats a lone CR as a row terminator', () => {
    expect(readCsvRows('a,b\r1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('preserves CRLF inside a quoted field', () => {
    expect(readCsvRows('a\n"line1\r\nline2"\n')).toEqual([['a'], ['line1\r\nline2']]);
  });

  it('keeps an empty trailing field', () => {
    expect(readCsvRows('a,b,\n')).toEqual([['a', 'b', '']]);
  });
});
