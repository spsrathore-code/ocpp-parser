import { analyzeLogLines } from '../../app/analyze';
import type { SessionEntry } from '../model/types';

/** Serialize a simulated session into lines the Parser's parseLines regex accepts. */
export function sessionToLogLines(entries: SessionEntry[]): string[] {
  return entries.map(e => {
    const tag = e.direction === 'sent' ? '>> message sent:' : '<< message received:';
    return `[${e.ts}] ${tag} ${JSON.stringify(e.frame)}`;
  });
}

export function analyzeSession(entries: SessionEntry[], name = 'Simulated Session') {
  return analyzeLogLines(sessionToLogLines(entries), name);
}
