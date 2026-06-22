import type { ProtocolRule } from './types';

/**
 * L4 protocol/state validation extension point (Phase 2 — §9).
 * Phase 1 reserves the interface and registry so rules can plug in later
 * WITHOUT changing L1–L3. Registered rules are NOT executed in Phase 1.
 */
const registry: ProtocolRule[] = [];

export function registerProtocolRules(rules: ProtocolRule[]): void {
  for (const rule of rules) {
    if (!registry.some(r => r.id === rule.id)) registry.push(rule);
  }
}

export function getRegisteredRules(): readonly ProtocolRule[] {
  return registry;
}

export function clearProtocolRules(): void {
  registry.length = 0;
}
