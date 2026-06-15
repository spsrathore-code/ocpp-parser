# Parser Phase 3a — Shell + Theme + Orchestrator + DOM Helper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the revamped parser's app shell so a user can upload an OCPP log, run the full existing parse→analysis pipeline, and see a rendered (placeholder) results container — the foundation Phase 3b fills in with real section bodies.

**Architecture:** A pure `analyze.ts` core runs the whole Phase 1–2 pipeline (parse → correlate → group → processTransactions → detect/health/protocol/ws) and returns one typed `AnalysisResult` bundle. A thin typed `dom.ts` helper builds elements. `shell.ts` builds the header/upload card and mounts a results container; `theme.ts` handles dark/light. `renderResults.ts` is the orchestrator that appends the 19 sections in §19.4 order (placeholders in 3a). `main.ts` wires it together.

**Tech Stack:** TypeScript + Vite + Vitest (jsdom for render tests). Tailwind via Play CDN (styling only, JIT picks up dynamic classes). No new bundled runtime deps in 3a (chart.js/xlsx arrive in 3c/3d).

**Spec:** `docs/superpowers/specs/2026-06-15-parser-phase3-render-design.md` · **SSOT:** `specs/requirements.md` (§19.4 render order, §19.1 deps, UI-002/006/007/011).

---

## File structure (created/modified in 3a)

- Create `src/app/analyze.ts` — `AnalysisResult` bundle + `analyzeLogLines(lines, fileName)` + `mergeParsed(...)` for multi-file.
- Create `src/app/render/dom.ts` — `el()`, `clearChildren()`, `collapsibleSection()`.
- Create `src/app/render/theme.ts` — `initTheme()`.
- Create `src/app/render/shell.ts` — `renderShell(root)` → `{ fileInput, parseBtn, container }`.
- Create `src/app/render/renderResults.ts` — `renderResults(container, result)`.
- Modify `src/app/main.ts` — wire shell + upload → analyze → render.
- Modify `index.html` — Tailwind Play CDN + config + Inter font + base classes.
- Modify `package.json` / `vite.config.ts` — add `jsdom` dev-dep; render tests opt into jsdom via per-file pragma.
- Tests: `tests/unit/dom.test.ts`, `tests/unit/analyze.test.ts`, `tests/unit/theme.test.ts`, `tests/unit/shell.test.ts`, `tests/unit/renderResults.test.ts`.

---

## Task 1: jsdom test infrastructure

**Files:**
- Modify: `package.json` (devDependencies)
- Test: `tests/unit/dom.test.ts` (temporary smoke assertion, expanded in Task 2)

- [ ] **Step 1: Install jsdom as a dev dependency**

Run: `npm install -D jsdom@25`
Expected: `jsdom` appears under `devDependencies`; `package-lock.json` updated.

- [ ] **Step 2: Write a smoke test that needs a DOM**

Create `tests/unit/dom.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

describe('jsdom environment', () => {
  it('provides document', () => {
    const div = document.createElement('div');
    div.textContent = 'hi';
    expect(div.textContent).toBe('hi');
  });
});
```

- [ ] **Step 3: Run it**

Run: `npx vitest run tests/unit/dom.test.ts`
Expected: PASS (the `@vitest-environment jsdom` pragma overrides the global `node` env for this file only).

- [ ] **Step 4: Confirm existing suite still green**

Run: `npm test`
Expected: all prior tests pass (52) + this one.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tests/unit/dom.test.ts
git commit -m "test(parser): add jsdom for render-layer tests (Phase 3a)"
```

---

## Task 2: DOM helper (`render/dom.ts`)

**Files:**
- Create: `src/app/render/dom.ts`
- Test: `tests/unit/dom.test.ts` (replace the smoke test)

- [ ] **Step 1: Write the failing tests**

Replace `tests/unit/dom.test.ts` with:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { el, clearChildren, collapsibleSection } from '../../src/app/render/dom';

describe('el — typed element builder', () => {
  it('sets text, className, and attributes', () => {
    const node = el('button', { className: 'btn', text: 'Go', attrs: { id: 'x', disabled: '' } });
    expect(node.tagName).toBe('BUTTON');
    expect(node.className).toBe('btn');
    expect(node.textContent).toBe('Go');
    expect(node.id).toBe('x');
    expect(node.hasAttribute('disabled')).toBe(true);
  });

  it('appends element and string children', () => {
    const node = el('div', {}, [el('span', { text: 'a' }), 'b']);
    expect(node.children).toHaveLength(1);
    expect(node.textContent).toBe('ab');
  });

  it('sets innerHTML when html is provided', () => {
    const node = el('div', { html: '<i>x</i>' });
    expect(node.querySelector('i')?.textContent).toBe('x');
  });
});

describe('clearChildren', () => {
  it('removes all children', () => {
    const node = el('div', {}, [el('span', {}), el('span', {})]);
    clearChildren(node);
    expect(node.children).toHaveLength(0);
  });
});

describe('collapsibleSection — UI-002 collapsible, UI-011 emoji title', () => {
  it('builds a section with an emoji+title header and a body that toggles', () => {
    const body = el('p', { text: 'content' });
    const section = collapsibleSection('Boot Notifications', '🔌', body);
    expect(section.tagName).toBe('SECTION');
    const header = section.querySelector('button')!;
    expect(header.textContent).toContain('🔌');
    expect(header.textContent).toContain('Boot Notifications');
    const wrapper = section.querySelector('[data-collapsible-body]') as HTMLElement;
    expect(wrapper.contains(body)).toBe(true);
    expect(wrapper.classList.contains('hidden')).toBe(false);
    header.click();
    expect(wrapper.classList.contains('hidden')).toBe(true);
    header.click();
    expect(wrapper.classList.contains('hidden')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/dom.test.ts`
Expected: FAIL — cannot resolve `../../src/app/render/dom`.

- [ ] **Step 3: Implement `src/app/render/dom.ts`**

```ts
// Thin typed DOM helper for the render layer. Produces the same markup the
// v2026.05.14 tool built with createElement + Tailwind innerHTML strings, with
// less repetition and full type-safety. No framework — plain DOM (TR-004).

export interface ElProps {
  className?: string;
  text?: string;
  /** Raw HTML for the element body (Tailwind-class markup). Mutually exclusive with `children`/`text`. */
  html?: string;
  attrs?: Record<string, string>;
}

/** Build an element: `el('div', { className, text|html, attrs }, children)`. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElProps = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.html !== undefined) node.innerHTML = props.html;
  else if (props.text !== undefined) node.textContent = props.text;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) node.setAttribute(k, v);
  for (const child of children) node.append(child);
  return node;
}

/** Remove every child of a node (replaces `container.innerHTML = ''`). */
export function clearChildren(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * Collapsible section wrapper (UI-002). Header shows `emoji  title` and toggles
 * the body's `hidden` class. Body starts expanded. The card carries the standard
 * section chrome; per-section gradient (UI-007) is applied by callers via `bodyClassName`.
 */
export function collapsibleSection(
  title: string,
  emoji: string,
  body: HTMLElement,
  bodyClassName = '',
): HTMLElement {
  const section = el('section', {
    className: 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-6',
  });
  const header = el('button', {
    className: 'w-full flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 text-left',
    text: `${emoji}  ${title}`,
  });
  const wrapper = el('div', { className: bodyClassName, attrs: { 'data-collapsible-body': '' } }, [body]);
  header.addEventListener('click', () => wrapper.classList.toggle('hidden'));
  section.append(header, wrapper);
  return section;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/dom.test.ts`
Expected: PASS (all 6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/render/dom.ts tests/unit/dom.test.ts
git commit -m "feat(parser): typed DOM helper + collapsible section (Phase 3a)"
```

---

## Task 3: Analysis bundle (`app/analyze.ts`)

**Files:**
- Create: `src/app/analyze.ts`
- Test: `tests/unit/analyze.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/analyze.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { analyzeLogLines } from '../../src/app/analyze';

function load(name: string): string[] {
  const path = fileURLToPath(new URL(`../../data/samples/${name}`, import.meta.url));
  return readFileSync(path, 'utf8').split(/\r?\n/);
}

describe('analyzeLogLines — full pipeline bundle (parity wiring)', () => {
  const result = analyzeLogLines(load('Sample OCPP Client Log .txt'), 'Sample OCPP Client Log .txt');

  it('produces every analysis field', () => {
    expect(result.transactions).toHaveLength(2);
    expect(result.messageGroups.StartTransaction.length).toBeGreaterThan(0);
    expect(Array.isArray(result.downtimes)).toBe(true);
    expect(result.wsHealth.status).toBeDefined();
    expect(Array.isArray(result.protocol.groups)).toBe(true);
    expect(Array.isArray(result.connectorStats)).toBe(true);
    expect(Array.isArray(result.energyDispense)).toBe(true);
    expect(Array.isArray(result.incompleteTransactions)).toBe(true);
    expect(result.rawLogLines.length).toBeGreaterThan(0);
  });

  it('connector stats agree with transaction count', () => {
    const totalRows = result.connectorStats.reduce((n, r) => n + r.total, 0);
    expect(totalRows).toBe(result.transactions.length);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/analyze.test.ts`
Expected: FAIL — cannot resolve `../../src/app/analyze`.

- [ ] **Step 3: Implement `src/app/analyze.ts`**

```ts
// Pipeline orchestration core — runs the full Phase 1–2 analysis and returns one
// typed bundle. This is the headless counterpart of the legacy displayResults():
// it computes everything; the render layer only draws. Pure and DOM-free so it
// stays unit-testable. The chunked/async file driver lives in main.ts (UI shell).

import { parseLines, type ParsedLines } from './parse/parseLines';
import { correlateMessages } from './parse/correlate';
import { groupMessagesByType } from './parse/groupMessages';
import { processTransactions } from './parse/processTransactions';
import { detectDowntimes } from './detect/detectDowntimes';
import { detectIncompleteTransactions } from './detect/incompleteTransactions';
import { detectMissingBootAfterPowerRestore, detectMissingStatusAfterEmergencyStop } from './detect/missingSync';
import { aggregateConnectorStats } from './health/connectorStats';
import { analyzeEnergyDispense } from './health/energyDispense';
import { runProtocolValidation } from './protocol/runProtocolValidation';
import { detectPhantomConnectionPattern } from './protocol/phantom';
import { analyzeWebSocketHealth } from './ws/wsHealth';

import type { MessageGroups, Transaction, InternalTxMap, ParsedMessage, ParsedEvent, ParsedAlert } from './model/types';
import type { Downtime, MissingSyncFlag, IncompleteTransaction } from './detect/types';
import type { ConnectorStatsRow, EnergyDispenseRow } from './health/types';
import type { ProtocolValidationResult, PhantomResult } from './protocol/types';
import type { WsHealth } from './ws/types';

/** Everything the render layer needs to draw the 19 sections (§19.4). */
export interface AnalysisResult {
  messages: ParsedMessage[];
  events: ParsedEvent[];
  alerts: ParsedAlert[];
  internalTxMap: InternalTxMap;
  messageGroups: MessageGroups;
  transactions: Transaction[];
  downtimes: Downtime[];
  incompleteTransactions: IncompleteTransaction[];
  powerRestoreSync: MissingSyncFlag[];
  emergencyStopSync: MissingSyncFlag[];
  connectorStats: ConnectorStatsRow[];
  energyDispense: EnergyDispenseRow[];
  protocol: ProtocolValidationResult;
  phantom: PhantomResult;
  wsHealth: WsHealth;
  rawLogLines: string[];
  filesProcessed: string[];
}

/** Merge per-file parse outputs into one combined `ParsedLines` (multi-file upload). */
export function mergeParsed(parts: ParsedLines[]): ParsedLines {
  const merged: ParsedLines = { messages: [], events: [], alerts: [], internalTxMap: new Map() };
  for (const p of parts) {
    merged.messages.push(...p.messages);
    merged.events.push(...p.events);
    merged.alerts.push(...p.alerts);
    p.internalTxMap.forEach((v, k) => merged.internalTxMap.set(k, v));
  }
  return merged;
}

/** Run the whole analysis over already-merged parse output + the raw lines (all files). */
export function analyze(parsed: ParsedLines, rawLogLines: string[], filesProcessed: string[]): AnalysisResult {
  const { messages, events, alerts, internalTxMap } = parsed;
  const messageGroups = groupMessagesByType(correlateMessages(messages));
  const transactions = processTransactions(messageGroups, internalTxMap);

  const { downtimes, wsEvents } = detectDowntimes(rawLogLines, messages, alerts);
  const incompleteTransactions = detectIncompleteTransactions(messageGroups, transactions);
  const powerRestoreSync = detectMissingBootAfterPowerRestore(downtimes, messages);
  const emergencyStopSync = detectMissingStatusAfterEmergencyStop(downtimes, messages);

  const connectorStats = aggregateConnectorStats(transactions);
  const energyDispense = analyzeEnergyDispense(transactions);

  const protocol = runProtocolValidation(messageGroups, transactions, internalTxMap, rawLogLines);
  const phantom = detectPhantomConnectionPattern(messageGroups.BootNotification, rawLogLines);
  const wsHealth = analyzeWebSocketHealth(wsEvents);

  return {
    messages, events, alerts, internalTxMap, messageGroups, transactions,
    downtimes, incompleteTransactions, powerRestoreSync, emergencyStopSync,
    connectorStats, energyDispense, protocol, phantom, wsHealth,
    rawLogLines, filesProcessed,
  };
}

/** Convenience: parse + analyze a single file's lines. */
export function analyzeLogLines(lines: string[], fileName: string): AnalysisResult {
  const parsed = parseLines(lines, fileName);
  return analyze(parsed, lines, [fileName]);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/analyze.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: `No errors found` (confirms every imported type name matches the modules).

- [ ] **Step 6: Commit**

```bash
git add src/app/analyze.ts tests/unit/analyze.test.ts
git commit -m "feat(parser): analysis-bundle orchestration core (Phase 3a)"
```

---

## Task 4: Theme (`render/theme.ts`)

**Files:**
- Create: `src/app/render/theme.ts`
- Test: `tests/unit/theme.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/theme.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { initTheme } from '../../src/app/render/theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  document.body.innerHTML = '<button id="theme-toggle-btn"></button>';
});

describe('initTheme — dark/light persistence (UI-006)', () => {
  it('applies dark when localStorage theme=dark', () => {
    localStorage.setItem('theme', 'dark');
    initTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles and persists on button click', () => {
    localStorage.setItem('theme', 'light');
    initTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    document.getElementById('theme-toggle-btn')!.click();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    document.getElementById('theme-toggle-btn')!.click();
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/theme.test.ts`
Expected: FAIL — cannot resolve `../../src/app/render/theme`.

- [ ] **Step 3: Implement `src/app/render/theme.ts`**

```ts
// Dark/light theme — faithful port of the v2026.05.14 tool's theme logic
// (HTML 251-302, UI-006). Toggles the `dark` class on <html> and persists the
// choice in localStorage['theme']; falls back to the OS preference when unset.

const KEY = 'theme';

function apply(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
}

function isDarkPreferred(): boolean {
  const stored = localStorage.getItem(KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** Apply the persisted/preferred theme and wire the #theme-toggle-btn click. */
export function initTheme(): void {
  apply(isDarkPreferred());
  const btn = document.getElementById('theme-toggle-btn');
  btn?.addEventListener('click', () => {
    const nowDark = !document.documentElement.classList.contains('dark');
    apply(nowDark);
    localStorage.setItem(KEY, nowDark ? 'dark' : 'light');
  });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/theme.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/render/theme.ts tests/unit/theme.test.ts
git commit -m "feat(parser): dark/light theme with persistence (Phase 3a)"
```

---

## Task 5: App shell (`render/shell.ts`)

**Files:**
- Create: `src/app/render/shell.ts`
- Test: `tests/unit/shell.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/shell.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderShell } from '../../src/app/render/shell';

describe('renderShell — header + upload card + container', () => {
  it('builds the shell and returns live element references', () => {
    const root = document.createElement('div');
    const refs = renderShell(root);

    // Header chrome (theme toggle id is what initTheme binds to).
    expect(root.querySelector('#theme-toggle-btn')).not.toBeNull();
    expect(root.querySelector('#help-btn')).not.toBeNull();
    expect(root.textContent).toContain('OCPP Client Log Parser');

    // Upload card.
    expect(refs.fileInput).toBeInstanceOf(HTMLInputElement);
    expect(refs.fileInput.accept).toContain('.txt');
    expect(refs.fileInput.multiple).toBe(true);
    expect(refs.parseBtn.disabled).toBe(true);

    // Results mount point.
    expect(refs.container.id).toBe('parsed-data-container');
    expect(root.contains(refs.container)).toBe(true);
  });

  it('enables the parse button once files are selected', () => {
    const root = document.createElement('div');
    const refs = renderShell(root);
    // jsdom can't set a real FileList; simulate the handler contract via a stub.
    Object.defineProperty(refs.fileInput, 'files', { value: [new File(['x'], 'a.txt')], configurable: true });
    refs.fileInput.dispatchEvent(new Event('change'));
    expect(refs.parseBtn.disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/shell.test.ts`
Expected: FAIL — cannot resolve `../../src/app/render/shell`.

- [ ] **Step 3: Implement `src/app/render/shell.ts`**

```ts
// App shell — header (title/version + theme & help buttons), the file-upload
// card, and the results mount point. Faithful port of the v2026.05.14 chrome
// (HTML 34-163), trimmed to what Phase 3a needs: the API-download section and
// log-repository panel are Phase 4. Returns live refs so main.ts can wire events.

import { el } from './dom';

export interface ShellRefs {
  fileInput: HTMLInputElement;
  parseBtn: HTMLButtonElement;
  container: HTMLDivElement;
}

export function renderShell(root: HTMLElement): ShellRefs {
  // --- Header ---
  const header = el('header', { className: 'text-center mb-8 relative' }, [
    el('h1', { className: 'text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100', text: 'OCPP Client Log Parser' }),
    el('p', { className: 'mt-1 text-sm text-gray-500 dark:text-gray-400', text: 'Modular TypeScript revamp · parity with v2026.05.14' }),
    el('div', { className: 'absolute top-0 right-0 flex gap-2' }, [
      el('button', {
        className: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg',
        text: '🌓 Theme', attrs: { id: 'theme-toggle-btn' },
      }),
      el('button', {
        className: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg',
        text: '❔ Help', attrs: { id: 'help-btn' },
      }),
    ]),
  ]);

  // --- Upload card (HTML 147-157) ---
  const fileInput = el('input', {
    className: 'block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300 cursor-pointer',
    attrs: { type: 'file', id: 'log-file-input', accept: '.txt,.log', multiple: '' },
  }) as HTMLInputElement;

  const parseBtn = el('button', {
    className: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
    text: 'Parse Files', attrs: { id: 'parse-log-btn', disabled: '' },
  }) as HTMLButtonElement;

  // Enable parse only when files are chosen (HTML behaviour).
  fileInput.addEventListener('change', () => {
    parseBtn.disabled = !(fileInput.files && fileInput.files.length > 0);
  });

  const uploadCard = el('section', { className: 'mb-8' }, [
    el('div', { className: 'max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700' }, [
      el('h2', { className: 'text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4', text: '📂 Upload Log Files' }),
      el('p', { className: 'text-sm text-gray-600 dark:text-gray-400 mb-4', text: 'Select one or more OCPP client log files (.txt or .log). Files are processed sequentially.' }),
      el('div', { className: 'flex items-center space-x-4' }, [fileInput, parseBtn]),
    ]),
  ]);

  const container = el('div', { attrs: { id: 'parsed-data-container' } }) as HTMLDivElement;

  root.append(header, uploadCard, container);
  return { fileInput, parseBtn, container };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/shell.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/render/shell.ts tests/unit/shell.test.ts
git commit -m "feat(parser): app shell — header + upload card + container (Phase 3a)"
```

---

## Task 6: Render orchestrator (`render/renderResults.ts`)

**Files:**
- Create: `src/app/render/renderResults.ts`
- Test: `tests/unit/renderResults.test.ts`

The orchestrator mirrors the legacy `displayResults` order (§19.4). In 3a each of the
19 sections is a placeholder (`collapsibleSection(title, emoji, <count line>)`); Phase 3b
replaces the bodies with real renderers one by one. The fixed ordered list lives here so
3b edits are localized.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/renderResults.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { analyzeLogLines } from '../../src/app/analyze';
import { renderResults, SECTION_ORDER } from '../../src/app/render/renderResults';

function load(name: string): string[] {
  const path = fileURLToPath(new URL(`../../data/samples/${name}`, import.meta.url));
  return readFileSync(path, 'utf8').split(/\r?\n/);
}

describe('renderResults — 19 sections in §19.4 order', () => {
  const result = analyzeLogLines(load('Sample OCPP Client Log .txt'), 'Sample OCPP Client Log .txt');

  it('declares exactly the 19 §19.4 sections in order', () => {
    expect(SECTION_ORDER.map((s) => s.title)).toEqual([
      'Debug Info', 'Boot Notifications', 'Heartbeats', 'Status Notifications',
      'Start Transactions', 'Stop Transactions', 'Transaction Summary',
      'Connector Stats', 'Transaction & Meter Values', 'Events', 'Alerts',
      'Downtime Report', 'Power Restore Missing Sync', 'Emergency Stop Release',
      'Fault Status Summary', 'Incomplete Transactions', 'Energy Dispense Check',
      'Protocol Compliance', 'WebSocket Health',
    ]);
  });

  it('renders one section element per entry, in order, into the container', () => {
    const container = document.createElement('div');
    renderResults(container, result);
    const sections = container.querySelectorAll('section');
    expect(sections).toHaveLength(19);
    expect(sections[0].textContent).toContain('Debug Info');
    expect(sections[18].textContent).toContain('WebSocket Health');
  });

  it('clears prior content on re-render', () => {
    const container = document.createElement('div');
    renderResults(container, result);
    renderResults(container, result);
    expect(container.querySelectorAll('section')).toHaveLength(19);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/renderResults.test.ts`
Expected: FAIL — cannot resolve `../../src/app/render/renderResults`.

- [ ] **Step 3: Implement `src/app/render/renderResults.ts`**

```ts
// Render orchestrator — the legacy displayResults() (HTML 2020-2624), headless
// input. Appends the 19 sections in the §19.4 order. In Phase 3a every body is a
// placeholder; Phase 3b swaps each `render` for the real section renderer, one at
// a time, without touching the ordering here.

import { el, clearChildren, collapsibleSection } from './dom';
import type { AnalysisResult } from '../analyze';

interface SectionDef {
  title: string;
  emoji: string;
  /** Count/summary used by the 3a placeholder; 3b replaces with the real renderer. */
  summary: (r: AnalysisResult) => string;
}

/** The §19.4 render order. Edited section-by-section in Phase 3b. */
export const SECTION_ORDER: SectionDef[] = [
  { title: 'Debug Info', emoji: '🐞', summary: (r) => `${r.messages.length} messages parsed` },
  { title: 'Boot Notifications', emoji: '🔌', summary: (r) => `${r.messageGroups.BootNotification.length} boot notifications` },
  { title: 'Heartbeats', emoji: '💓', summary: (r) => `${r.messageGroups.Heartbeat.length} heartbeats` },
  { title: 'Status Notifications', emoji: '📋', summary: (r) => `${r.messageGroups.StatusNotification.length} status notifications` },
  { title: 'Start Transactions', emoji: '▶️', summary: (r) => `${r.messageGroups.StartTransaction.length} start transactions` },
  { title: 'Stop Transactions', emoji: '⏹️', summary: (r) => `${r.messageGroups.StopTransaction.length} stop transactions` },
  { title: 'Transaction Summary', emoji: '📊', summary: (r) => `${r.transactions.length} complete transactions` },
  { title: 'Connector Stats', emoji: '🔌', summary: (r) => `${r.connectorStats.length} connectors` },
  { title: 'Transaction & Meter Values', emoji: '⚡', summary: (r) => `${r.transactions.length} transactions` },
  { title: 'Events', emoji: '📅', summary: (r) => `${r.events.length} events` },
  { title: 'Alerts', emoji: '🚨', summary: (r) => `${r.alerts.length} alerts` },
  { title: 'Downtime Report', emoji: '📉', summary: (r) => `${r.downtimes.length} downtimes` },
  { title: 'Power Restore Missing Sync', emoji: '🔄', summary: (r) => `${r.powerRestoreSync.length} flags` },
  { title: 'Emergency Stop Release', emoji: '🛑', summary: (r) => `${r.emergencyStopSync.length} flags` },
  { title: 'Fault Status Summary', emoji: '⚠️', summary: (r) => `${r.messageGroups.StatusNotification.length} status notifications scanned` },
  { title: 'Incomplete Transactions', emoji: '🧩', summary: (r) => `${r.incompleteTransactions.length} incomplete` },
  { title: 'Energy Dispense Check', emoji: '⚡', summary: (r) => `${r.energyDispense.length} connectors` },
  { title: 'Protocol Compliance', emoji: '✅', summary: (r) => `${r.protocol.groups.length} check groups` },
  { title: 'WebSocket Health', emoji: '🌐', summary: (r) => `status: ${r.wsHealth.status}` },
];

/** Render every section into `container` (clears prior content first). */
export function renderResults(container: HTMLElement, result: AnalysisResult): void {
  clearChildren(container);
  for (const def of SECTION_ORDER) {
    const body = el('p', { className: 'text-sm text-gray-600 dark:text-gray-400', text: def.summary(result) });
    container.appendChild(collapsibleSection(def.title, def.emoji, body));
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/renderResults.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + full suite**

Run: `npx tsc --noEmit && npm test`
Expected: `No errors found`; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/render/renderResults.ts tests/unit/renderResults.test.ts
git commit -m "feat(parser): render orchestrator — 19 sections in §19.4 order (Phase 3a)"
```

---

## Task 7: Wire it together (`main.ts` + `index.html`) and verify in the browser

**Files:**
- Modify: `src/app/main.ts`
- Modify: `index.html`

- [ ] **Step 1: Add Tailwind (Play CDN) + Inter font + dark-mode config to `index.html`**

Replace `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OCPP Client Log Parser</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = { darkMode: 'class' };
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      body { font-family: 'Inter', system-ui, sans-serif; }
    </style>
  </head>
  <body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
    <div id="app" class="container mx-auto px-4 py-8"></div>
    <script type="module" src="/src/app/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Implement `src/app/main.ts`**

```ts
// Vite entry point — wires the app shell to the analysis pipeline and renderer.
// Multi-file upload: each file is read, parsed, and the parse outputs merged
// before a single analyze() pass (parity with the legacy sequential read + one
// displayResults). Reading is async to keep the UI responsive on large files.

import { renderShell } from './render/shell';
import { initTheme } from './render/theme';
import { renderResults } from './render/renderResults';
import { parseLines } from './parse/parseLines';
import { analyze, mergeParsed } from './analyze';
import type { ParsedLines } from './parse/parseLines';

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  const { fileInput, parseBtn, container } = renderShell(root);
  initTheme();

  parseBtn.addEventListener('click', async () => {
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) return;
    parseBtn.disabled = true;
    parseBtn.textContent = 'Parsing…';
    try {
      const parts: ParsedLines[] = [];
      const allLines: string[] = [];
      const names: string[] = [];
      for (const file of files) {
        const lines = (await file.text()).split(/\r?\n/);
        parts.push(parseLines(lines, file.name));
        allLines.push(...lines);
        names.push(file.name);
      }
      const result = analyze(mergeParsed(parts), allLines, names);
      renderResults(container, result);
    } finally {
      parseBtn.textContent = 'Parse Files';
      parseBtn.disabled = false;
    }
  });
}
```

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: `No errors found`; Vite build succeeds, `dist/` emitted.

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev`
Then in the browser at the printed local URL:
1. Confirm the header, theme toggle, and upload card render with Tailwind styling.
2. Click the theme toggle → page switches dark/light; reload → choice persists.
3. Upload `data/samples/Sample OCPP Client Log .txt` → click **Parse Files**.
4. Confirm 19 collapsible sections appear in §19.4 order; "Transaction Summary" reads "2 complete transactions"; clicking a section header collapses/expands it.

Expected: all four checks pass. (This is the 3a parity smoke test; per-section parity comes in 3b.)

- [ ] **Step 5: Commit**

```bash
git add src/app/main.ts index.html
git commit -m "feat(parser): wire shell→analyze→render; Tailwind CDN shell (Phase 3a)"
```

---

## Task 8: Update trackers (phase-boundary discipline)

**Files:**
- Modify: `skills/WORKFLOW.md`, `specs/roadmap.md`, `specs/tasks.md`, `knowledge/project-journal.md`

- [ ] **Step 1: Mark 3a complete**

In `skills/WORKFLOW.md` add a `Phase 3` sub-phase block with `3a` checked. In `specs/roadmap.md` set the Parser row to "Phase 3a done" and tick 3a in the phase tracker. In `specs/tasks.md` move "Phase 3a — shell/theme/orchestrator" to Done and promote "Phase 3b — static sections" to Next. Append a dated entry to `knowledge/project-journal.md` (Discussed/Decided/Implemented/Next).

- [ ] **Step 2: Commit**

```bash
git add skills/WORKFLOW.md specs/roadmap.md specs/tasks.md knowledge/project-journal.md
git commit -m "docs(parser): Phase 3a complete — tracker refresh"
```

---

## Definition of done (Phase 3a)

- App runs via `npm run dev`: shell renders, theme toggles + persists, uploading the sample log renders 19 ordered collapsible placeholder sections.
- New unit tests pass (dom, analyze, theme, shell, renderResults); the full suite is green; `tsc --noEmit` clean; `npm run build` succeeds.
- `AnalysisResult` is the single typed seam the Phase 3b section renderers consume.
- Trackers updated at the phase boundary.
