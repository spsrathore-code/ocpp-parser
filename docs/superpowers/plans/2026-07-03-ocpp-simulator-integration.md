# OCPP Simulator — Suite Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the OCPP Simulator (Tab 1 of `OCPP Transaction Simulator Extended V3_17 Aug.html`) into the suite as the seed of Tool #3, expanded to all 28 OCPP 1.6J messages, categorized for training, validated by the Validation Engine, and able to hand a session to the Parser.

**Architecture:** New TS modules under `src/simulator/` with a second Vite page entry (`simulator.html`). The message catalog is derived at runtime from `typed-ocpp`'s `OCPP16.schemas` (the same source the Validation Engine uses), with a small static overlay for Profile/Direction/training-defaults. Both modes (offline "Simulator Only", live "Charge Point (CP) Mode") are preserved; validation routes through `src/services/validation`; a completed session serializes to Parser log lines and runs through `src/app/analyze.analyzeLogLines`.

**Tech Stack:** TypeScript, Vite 5 (multi-page), Vitest 2 (+ jsdom for DOM tests), `typed-ocpp` 1.5.6, existing in-repo `src/services/validation` and `src/app`.

## Global Constraints

- No source file > 2000 lines (hard constraint). Keep modules focused.
- Standards first: OCPP 1.6J compliance; the catalog is schema-driven — never hand-maintain field definitions (R8).
- Both modes preserved; Simulator Only must work fully offline with no network (R1, R5).
- Do NOT modify the Parser (`src/app`) or the Validation Engine (`src/services/validation`) — the simulator conforms to their existing public APIs.
- Do NOT edit the legacy Parser HTML.
- Git: work on `feat/parser-revamp` (current branch) or a new `feat/ocpp-simulator` branch; never commit to `main`. Commit after every task.
- Every phase ends with `npm run typecheck` + `npm run build` clean and `npm test` green.

**Validation Engine public API (from `src/services/validation/index.ts` — consume, do not change):**
- `validateMessage(frame: unknown[]): MessageResult` — L1+L2 for one frame.
- `class ExchangeTracker` — `.add(frame: unknown[], ts?: string): MessageResult`, `.finalize(): ExchangeResult[]`.
- Types: `MessageResult { ok, kind?, action?, messageId?, violations: Violation[] }`, `Violation { layer, code, message, path?, detail? }`.

**Parser public API (from `src/app/analyze.ts` — consume, do not change):**
- `analyzeLogLines(lines: string[], fileName: string): AnalysisResult`.
- `renderResults(container: HTMLElement, result: AnalysisResult)` from `src/app/render/renderResults`.

**Parser log-line format (from `src/app/parse/parseLines.ts` — the adapter MUST match):**
- OCPP message line: `[<timestamp>] >> message sent: <frameJSON>` or `[<timestamp>] << message received: <frameJSON>`
- Regex: `/(?:>>|<<) message (?:sent|received): ((\[|{).*(\]|}))/`; timestamp is the first `[...]`.

**Catalog source (`typed-ocpp`):** `import { OCPP16 } from 'typed-ocpp'` → `OCPP16.schemas` is an object with 56 keys `AuthorizeRequest`, `AuthorizeResponse`, …, each a JSON-schema object (`properties`, `required[]`, `enum`, `type`, `format`, `maxLength`).

**The 28 operations → Profile / Direction (the R7 categorization, verbatim):**
- **Core / CP_TO_CS:** Authorize, BootNotification, Heartbeat, MeterValues, StatusNotification, StartTransaction, StopTransaction
- **Core / CS_TO_CP:** ChangeAvailability, ChangeConfiguration, GetConfiguration, ClearCache, Reset, UnlockConnector, RemoteStartTransaction, RemoteStopTransaction
- **Core / BOTH:** DataTransfer
- **Firmware Management / CP_TO_CS:** DiagnosticsStatusNotification, FirmwareStatusNotification
- **Firmware Management / CS_TO_CP:** GetDiagnostics, UpdateFirmware
- **Local Auth List / CS_TO_CP:** GetLocalListVersion, SendLocalList
- **Reservation / CS_TO_CP:** ReserveNow, CancelReservation
- **Smart Charging / CS_TO_CP:** SetChargingProfile, ClearChargingProfile, GetCompositeSchedule
- **Remote Trigger / CS_TO_CP:** TriggerMessage

---

## File Structure

```
simulator.html                          # NEW second Vite entry
src/simulator/
├── main.ts                             # entry wiring
├── model/types.ts                      # Profile, Direction, FieldDef, MessageDef, SessionEntry
├── catalog/
│   ├── schemaFields.ts                 # JSON-schema properties → FieldDef[]
│   ├── metadata.ts                     # 28-row Profile/Direction (+ optional defaults/descriptions) overlay
│   └── buildCatalog.ts                 # OCPP16.schemas + metadata → MessageDef[]
├── validate/engineAdapter.ts           # thin wrapper over src/services/validation
├── transport/wsClient.ts               # CP-Mode WebSocket client (injectable socket for tests)
├── session/toParser.ts                 # SessionEntry[] → Parser log lines → analyzeLogLines
└── render/
    ├── payload.ts                      # frame builders + default-response generator
    ├── selector.ts                     # Profile → Direction → Message pickers
    ├── paramForm.ts                    # schema-driven request/response form
    ├── logConsole.ts                   # SENT/RECEIVED transcript + "Analyze in Parser"
    └── shell.ts                        # header, mode toggle, connection panel, layout
tests/simulator/                        # all simulator tests
```

---

## Phase 0 — Scaffold (second Vite entry, module skeleton, file moves)

### Task 0.1: Multi-page Vite config + simulator entry page

**Files:**
- Modify: `vite.config.ts`
- Create: `simulator.html`
- Create: `src/simulator/main.ts`

**Interfaces:**
- Produces: a second build entry `simulator` served at `/simulator.html`; `src/simulator/main.ts` mounts into `#app`.

- [ ] **Step 1: Add the MPA input to `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Single config for Vite (dev/build) and Vitest (test). Root = repo root.
// Two page entries: the Parser (index.html) and the OCPP Simulator (simulator.html).
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        simulator: resolve('simulator.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 2: Create `simulator.html`** (mirrors the Parser shell: Tailwind CDN + `#app` + module entry)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OCPP Simulator — Ador Charger Emulator</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = { darkMode: 'class', theme: { extend: {} } };</script>
</head>
<body class="bg-slate-50 dark:bg-gray-900">
  <div id="app"></div>
  <script type="module" src="/src/simulator/main.ts"></script>
</body>
</html>
```

- [ ] **Step 3: Create a minimal `src/simulator/main.ts`** (proves the entry boots; real wiring lands in later tasks)

```ts
// Entry point for the OCPP Simulator page. Real wiring is added in Phase 1+.
const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  root.innerHTML = '<p class="p-6 text-gray-600 dark:text-gray-300">OCPP Simulator — scaffold OK</p>';
}
```

- [ ] **Step 4: Verify both pages build**

Run: `npm run build`
Expected: PASS; `dist/index.html` and `dist/simulator.html` both emitted.

- [ ] **Step 5: Verify dev serves the simulator**

Run: `npm run dev` then open `http://localhost:5173/simulator.html`
Expected: "OCPP Simulator — scaffold OK" renders.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts simulator.html src/simulator/main.ts
git commit -m "feat(simulator): scaffold second Vite entry for OCPP Simulator"
```

### Task 0.2: Relocate the reference artifacts

**Files:**
- Move: `OCPP Transaction Simulator Extended V3_17 Aug.html` → `archive/OCPP Transaction Simulator Extended V3_17 Aug.html`
- Move: `CMS Logs Sample.xlsx` → `data/samples/CMS Logs Sample.xlsx`
- Modify: `docs/md-registry.md` (the HTML is not an MD file, so no registry row is needed; only note the move if a data index exists — otherwise skip)

- [ ] **Step 1: Move the files with git**

```bash
git mv "OCPP Transaction Simulator Extended V3_17 Aug.html" "archive/OCPP Transaction Simulator Extended V3_17 Aug.html"
git mv "CMS Logs Sample.xlsx" "data/samples/CMS Logs Sample.xlsx"
```

- [ ] **Step 2: Verify the working tree is clean of the root copies**

Run: `git status`
Expected: the two files show as renamed (`R`) into `archive/` and `data/samples/`.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(simulator): archive reference HTML, move CMS sample to data/samples"
```

---

## Phase 1 — Schema-driven catalog + selection + forms

### Task 1.1: Type model

**Files:**
- Create: `src/simulator/model/types.ts`
- Test: `tests/simulator/types.test.ts` (compile-only guard)

**Interfaces:**
- Produces: `Profile`, `Direction`, `FieldType`, `FieldDef`, `MessageDef`, `SessionEntry`.

- [ ] **Step 1: Write the failing test** (a type-usage smoke test)

```ts
// tests/simulator/types.test.ts
import { describe, it, expect } from 'vitest';
import type { MessageDef, FieldDef, SessionEntry } from '../../src/simulator/model/types';

describe('simulator types', () => {
  it('compose a MessageDef', () => {
    const f: FieldDef = { name: 'idTag', type: 'string', required: true, maxLength: 20 };
    const m: MessageDef = { action: 'Authorize', profile: 'Core', direction: 'CP_TO_CS', request: [f], response: [] };
    const e: SessionEntry = { ts: '2026-07-03T10:00:00Z', direction: 'sent', frame: [2, 'id', 'Authorize', {}] };
    expect(m.request[0].name).toBe('idTag');
    expect(e.frame[0]).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/types.test.ts`
Expected: FAIL — cannot find module `types`.

- [ ] **Step 3: Implement `src/simulator/model/types.ts`**

```ts
export type Profile =
  | 'Core' | 'Firmware Management' | 'Local Auth List'
  | 'Reservation' | 'Smart Charging' | 'Remote Trigger';

export type Direction = 'CP_TO_CS' | 'CS_TO_CP' | 'BOTH';

export type FieldType = 'string' | 'integer' | 'number' | 'boolean' | 'enum' | 'datetime' | 'json';

export interface FieldDef {
  name: string;
  type: FieldType;
  required: boolean;
  enumValues?: string[];
  maxLength?: number;
  /** training overlay — a friendly starting value shown in the form */
  default?: string;
  /** training overlay — plain-language help text */
  description?: string;
}

export interface MessageDef {
  action: string;
  profile: Profile;
  direction: Direction;
  request: FieldDef[];
  response: FieldDef[];
}

export interface SessionEntry {
  /** ISO timestamp */
  ts: string;
  direction: 'sent' | 'received';
  /** [2,id,action,payload] or [3,id,payload] */
  frame: unknown[];
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/simulator/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/simulator/model/types.ts tests/simulator/types.test.ts
git commit -m "feat(simulator): add core type model"
```

### Task 1.2: Schema → FieldDef derivation (R8 core)

**Files:**
- Create: `src/simulator/catalog/schemaFields.ts`
- Test: `tests/simulator/schemaFields.test.ts`

**Interfaces:**
- Consumes: `FieldDef`, `FieldType` from `model/types`.
- Produces: `fieldsFromSchema(schema: unknown): FieldDef[]`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/simulator/schemaFields.test.ts
import { describe, it, expect } from 'vitest';
import { fieldsFromSchema } from '../../src/simulator/catalog/schemaFields';

describe('fieldsFromSchema', () => {
  it('maps scalar + maxLength + required', () => {
    const schema = { type: 'object', properties: { idTag: { type: 'string', maxLength: 20 } }, required: ['idTag'] };
    const [f] = fieldsFromSchema(schema);
    expect(f).toMatchObject({ name: 'idTag', type: 'string', required: true, maxLength: 20 });
  });

  it('maps enum', () => {
    const schema = { type: 'object', properties: { type: { type: 'string', enum: ['Hard', 'Soft'] } }, required: ['type'] };
    const [f] = fieldsFromSchema(schema);
    expect(f.type).toBe('enum');
    expect(f.enumValues).toEqual(['Hard', 'Soft']);
  });

  it('maps date-time to datetime', () => {
    const schema = { type: 'object', properties: { currentTime: { type: 'string', format: 'date-time' } } };
    expect(fieldsFromSchema(schema)[0].type).toBe('datetime');
  });

  it('maps object/array to json', () => {
    const schema = { type: 'object', properties: { meterValue: { type: 'array', items: {} } } };
    expect(fieldsFromSchema(schema)[0].type).toBe('json');
  });

  it('returns [] for an empty schema', () => {
    expect(fieldsFromSchema({ type: 'object', properties: {} })).toEqual([]);
    expect(fieldsFromSchema({})).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/schemaFields.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/simulator/catalog/schemaFields.ts`**

```ts
import type { FieldDef, FieldType } from '../model/types';

interface JsonSchemaProp {
  type?: string | string[];
  format?: string;
  enum?: string[];
  maxLength?: number;
}
interface JsonSchema {
  properties?: Record<string, JsonSchemaProp>;
  required?: string[];
}

function typeOf(prop: JsonSchemaProp): Pick<FieldDef, 'type' | 'enumValues' | 'maxLength'> {
  if (Array.isArray(prop.enum) && prop.enum.length > 0) {
    return { type: 'enum', enumValues: prop.enum };
  }
  const t = prop.type;
  if (t === 'string') {
    if (prop.format === 'date-time') return { type: 'datetime', maxLength: prop.maxLength };
    return { type: 'string', maxLength: prop.maxLength };
  }
  if (t === 'integer') return { type: 'integer' };
  if (t === 'number') return { type: 'number' };
  if (t === 'boolean') return { type: 'boolean' };
  // object / array / unknown → JSON editor
  return { type: 'json' as FieldType };
}

/** Convert a draft-04 JSON-schema object into the simulator's FieldDef list. */
export function fieldsFromSchema(schema: unknown): FieldDef[] {
  const s = (schema ?? {}) as JsonSchema;
  const props = s.properties;
  if (!props) return [];
  const required = new Set(s.required ?? []);
  return Object.entries(props).map(([name, prop]) => ({
    name,
    required: required.has(name),
    ...typeOf(prop),
  }));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/simulator/schemaFields.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/simulator/catalog/schemaFields.ts tests/simulator/schemaFields.test.ts
git commit -m "feat(simulator): derive form fields from JSON schema"
```

### Task 1.3: Profile/Direction metadata overlay

**Files:**
- Create: `src/simulator/catalog/metadata.ts`
- Test: `tests/simulator/metadata.test.ts`

**Interfaces:**
- Consumes: `Profile`, `Direction` from `model/types`.
- Produces: `MESSAGE_META: Record<string, { profile: Profile; direction: Direction }>`, `ACTIONS: string[]` (the 28 action names).

- [ ] **Step 1: Write the failing test**

```ts
// tests/simulator/metadata.test.ts
import { describe, it, expect } from 'vitest';
import { MESSAGE_META, ACTIONS } from '../../src/simulator/catalog/metadata';

describe('message metadata', () => {
  it('covers all 28 operations', () => {
    expect(ACTIONS).toHaveLength(28);
  });
  it('tags direction and profile', () => {
    expect(MESSAGE_META.Authorize).toEqual({ profile: 'Core', direction: 'CP_TO_CS' });
    expect(MESSAGE_META.Reset).toEqual({ profile: 'Core', direction: 'CS_TO_CP' });
    expect(MESSAGE_META.DataTransfer).toEqual({ profile: 'Core', direction: 'BOTH' });
    expect(MESSAGE_META.TriggerMessage).toEqual({ profile: 'Remote Trigger', direction: 'CS_TO_CP' });
    expect(MESSAGE_META.SetChargingProfile.profile).toBe('Smart Charging');
  });
  it('every action has metadata', () => {
    for (const a of ACTIONS) expect(MESSAGE_META[a]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/metadata.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/simulator/catalog/metadata.ts`** (full 28-row table, verbatim from Global Constraints)

```ts
import type { Profile, Direction } from '../model/types';

export const MESSAGE_META: Record<string, { profile: Profile; direction: Direction }> = {
  // Core — CP → CS
  Authorize: { profile: 'Core', direction: 'CP_TO_CS' },
  BootNotification: { profile: 'Core', direction: 'CP_TO_CS' },
  Heartbeat: { profile: 'Core', direction: 'CP_TO_CS' },
  MeterValues: { profile: 'Core', direction: 'CP_TO_CS' },
  StatusNotification: { profile: 'Core', direction: 'CP_TO_CS' },
  StartTransaction: { profile: 'Core', direction: 'CP_TO_CS' },
  StopTransaction: { profile: 'Core', direction: 'CP_TO_CS' },
  // Core — CS → CP
  ChangeAvailability: { profile: 'Core', direction: 'CS_TO_CP' },
  ChangeConfiguration: { profile: 'Core', direction: 'CS_TO_CP' },
  GetConfiguration: { profile: 'Core', direction: 'CS_TO_CP' },
  ClearCache: { profile: 'Core', direction: 'CS_TO_CP' },
  Reset: { profile: 'Core', direction: 'CS_TO_CP' },
  UnlockConnector: { profile: 'Core', direction: 'CS_TO_CP' },
  RemoteStartTransaction: { profile: 'Core', direction: 'CS_TO_CP' },
  RemoteStopTransaction: { profile: 'Core', direction: 'CS_TO_CP' },
  // Core — both
  DataTransfer: { profile: 'Core', direction: 'BOTH' },
  // Firmware Management
  DiagnosticsStatusNotification: { profile: 'Firmware Management', direction: 'CP_TO_CS' },
  FirmwareStatusNotification: { profile: 'Firmware Management', direction: 'CP_TO_CS' },
  GetDiagnostics: { profile: 'Firmware Management', direction: 'CS_TO_CP' },
  UpdateFirmware: { profile: 'Firmware Management', direction: 'CS_TO_CP' },
  // Local Auth List
  GetLocalListVersion: { profile: 'Local Auth List', direction: 'CS_TO_CP' },
  SendLocalList: { profile: 'Local Auth List', direction: 'CS_TO_CP' },
  // Reservation
  ReserveNow: { profile: 'Reservation', direction: 'CS_TO_CP' },
  CancelReservation: { profile: 'Reservation', direction: 'CS_TO_CP' },
  // Smart Charging
  SetChargingProfile: { profile: 'Smart Charging', direction: 'CS_TO_CP' },
  ClearChargingProfile: { profile: 'Smart Charging', direction: 'CS_TO_CP' },
  GetCompositeSchedule: { profile: 'Smart Charging', direction: 'CS_TO_CP' },
  // Remote Trigger
  TriggerMessage: { profile: 'Remote Trigger', direction: 'CS_TO_CP' },
};

export const ACTIONS: string[] = Object.keys(MESSAGE_META);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/simulator/metadata.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/simulator/catalog/metadata.ts tests/simulator/metadata.test.ts
git commit -m "feat(simulator): add profile/direction metadata for all 28 operations"
```

### Task 1.4: Build the catalog from `OCPP16.schemas`

**Files:**
- Create: `src/simulator/catalog/buildCatalog.ts`
- Test: `tests/simulator/buildCatalog.test.ts`

**Interfaces:**
- Consumes: `fieldsFromSchema` (1.2), `MESSAGE_META`/`ACTIONS` (1.3), `OCPP16.schemas` from `typed-ocpp`.
- Produces: `buildCatalog(): MessageDef[]`, `getMessage(action: string): MessageDef | undefined`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/simulator/buildCatalog.test.ts
import { describe, it, expect } from 'vitest';
import { buildCatalog, getMessage } from '../../src/simulator/catalog/buildCatalog';

describe('buildCatalog', () => {
  const catalog = buildCatalog();

  it('produces all 28 messages', () => {
    expect(catalog).toHaveLength(28);
  });

  it('derives Authorize request from schema (idTag required, maxLength 20)', () => {
    const authorize = getMessage('Authorize')!;
    expect(authorize.profile).toBe('Core');
    expect(authorize.direction).toBe('CP_TO_CS');
    const idTag = authorize.request.find(f => f.name === 'idTag')!;
    expect(idTag).toMatchObject({ type: 'string', required: true, maxLength: 20 });
  });

  it('derives Reset request enum from schema', () => {
    const reset = getMessage('Reset')!;
    const typeField = reset.request.find(f => f.name === 'type')!;
    expect(typeField.type).toBe('enum');
    expect(typeField.enumValues).toEqual(['Hard', 'Soft']);
  });

  it('has a response shape (BootNotification.conf has status/currentTime/interval)', () => {
    const boot = getMessage('BootNotification')!;
    expect(boot.response.map(f => f.name).sort()).toEqual(['currentTime', 'interval', 'status']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/buildCatalog.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/simulator/catalog/buildCatalog.ts`**

```ts
import { OCPP16 } from 'typed-ocpp';
import type { MessageDef } from '../model/types';
import { fieldsFromSchema } from './schemaFields';
import { MESSAGE_META, ACTIONS } from './metadata';

const schemas = OCPP16.schemas as unknown as Record<string, unknown>;

/** Build the full 28-message catalog from typed-ocpp's schemas + the metadata overlay. */
export function buildCatalog(): MessageDef[] {
  return ACTIONS.map((action): MessageDef => {
    const meta = MESSAGE_META[action];
    return {
      action,
      profile: meta.profile,
      direction: meta.direction,
      request: fieldsFromSchema(schemas[`${action}Request`]),
      response: fieldsFromSchema(schemas[`${action}Response`]),
    };
  });
}

let cached: MessageDef[] | null = null;
function catalog(): MessageDef[] {
  if (!cached) cached = buildCatalog();
  return cached;
}

export function getMessage(action: string): MessageDef | undefined {
  return catalog().find(m => m.action === action);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/simulator/buildCatalog.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/simulator/catalog/buildCatalog.ts tests/simulator/buildCatalog.test.ts
git commit -m "feat(simulator): build 28-message catalog from typed-ocpp schemas"
```

### Task 1.5: Selector UI (Profile → Direction → Message)

**Files:**
- Create: `src/simulator/render/selector.ts`
- Test: `tests/simulator/selector.test.ts` (jsdom)

**Interfaces:**
- Consumes: `MessageDef` (types), `buildCatalog` (1.4).
- Produces: `renderSelector(mount: HTMLElement, catalog: MessageDef[], onSelect: (action: string) => void): void`.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
// tests/simulator/selector.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderSelector } from '../../src/simulator/render/selector';
import { buildCatalog } from '../../src/simulator/catalog/buildCatalog';

describe('renderSelector', () => {
  it('lists profile groups and fires onSelect', () => {
    const mount = document.createElement('div');
    const onSelect = vi.fn();
    renderSelector(mount, buildCatalog(), onSelect);
    // profile filter has all 6 groups
    const profileSel = mount.querySelector<HTMLSelectElement>('[data-role="profile"]')!;
    const opts = Array.from(profileSel.options).map(o => o.value);
    expect(opts).toContain('Smart Charging');
    // message dropdown populated
    const msgSel = mount.querySelector<HTMLSelectElement>('[data-role="message"]')!;
    expect(msgSel.options.length).toBeGreaterThan(0);
    // selecting a message fires the callback
    msgSel.value = 'Authorize';
    msgSel.dispatchEvent(new Event('change'));
    expect(onSelect).toHaveBeenCalledWith('Authorize');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/selector.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/simulator/render/selector.ts`**

```ts
import type { MessageDef, Profile, Direction } from '../model/types';

const PROFILES: Profile[] = ['Core', 'Firmware Management', 'Local Auth List', 'Reservation', 'Smart Charging', 'Remote Trigger'];
const DIRECTIONS: { value: Direction | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All directions' },
  { value: 'CP_TO_CS', label: 'Charge Point → Central System' },
  { value: 'CS_TO_CP', label: 'Central System → Charge Point' },
  { value: 'BOTH', label: 'Both' },
];

export function renderSelector(mount: HTMLElement, catalog: MessageDef[], onSelect: (action: string) => void): void {
  mount.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <select data-role="profile" class="px-3 py-2 border rounded-md">
        <option value="ALL">All profiles</option>
        ${PROFILES.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
      <select data-role="direction" class="px-3 py-2 border rounded-md">
        ${DIRECTIONS.map(d => `<option value="${d.value}">${d.label}</option>`).join('')}
      </select>
      <select data-role="message" class="px-3 py-2 border rounded-md"></select>
    </div>`;

  const profileSel = mount.querySelector<HTMLSelectElement>('[data-role="profile"]')!;
  const dirSel = mount.querySelector<HTMLSelectElement>('[data-role="direction"]')!;
  const msgSel = mount.querySelector<HTMLSelectElement>('[data-role="message"]')!;

  const repopulate = () => {
    const p = profileSel.value;
    const d = dirSel.value;
    const filtered = catalog.filter(m =>
      (p === 'ALL' || m.profile === p) &&
      (d === 'ALL' || m.direction === d || (d !== 'BOTH' && m.direction === 'BOTH')),
    );
    msgSel.innerHTML = filtered
      .map(m => `<option value="${m.action}">${m.action} (${m.direction === 'CP_TO_CS' ? 'CP→CS' : m.direction === 'CS_TO_CP' ? 'CS→CP' : 'both'})</option>`)
      .join('');
  };

  profileSel.addEventListener('change', repopulate);
  dirSel.addEventListener('change', repopulate);
  msgSel.addEventListener('change', () => { if (msgSel.value) onSelect(msgSel.value); });
  repopulate();
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/simulator/selector.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/simulator/render/selector.ts tests/simulator/selector.test.ts
git commit -m "feat(simulator): profile/direction/message selector"
```

### Task 1.6: Schema-driven parameter form + frame builder

**Files:**
- Create: `src/simulator/render/paramForm.ts`
- Create: `src/simulator/render/payload.ts`
- Test: `tests/simulator/paramForm.test.ts` (jsdom), `tests/simulator/payload.test.ts`

**Interfaces:**
- Consumes: `FieldDef`, `MessageDef` (types).
- Produces:
  - `payload.ts`: `buildCallFrame(action: string, messageId: string, payload: Record<string, unknown>): unknown[]` → `[2, messageId, action, payload]`; `buildResultFrame(messageId: string, payload: Record<string, unknown>): unknown[]` → `[3, messageId, payload]`; `defaultResponse(fields: FieldDef[]): Record<string, unknown>`.
  - `paramForm.ts`: `renderParamForm(mount: HTMLElement, fields: FieldDef[]): void`; `readForm(mount: HTMLElement, fields: FieldDef[]): Record<string, unknown>`.

- [ ] **Step 1: Write the failing test for `payload.ts`**

```ts
// tests/simulator/payload.test.ts
import { describe, it, expect } from 'vitest';
import { buildCallFrame, buildResultFrame, defaultResponse } from '../../src/simulator/render/payload';
import type { FieldDef } from '../../src/simulator/model/types';

describe('payload builders', () => {
  it('builds a Call frame', () => {
    expect(buildCallFrame('Authorize', 'id-1', { idTag: 'ABC' })).toEqual([2, 'id-1', 'Authorize', { idTag: 'ABC' }]);
  });
  it('builds a CallResult frame', () => {
    expect(buildResultFrame('id-1', { status: 'Accepted' })).toEqual([3, 'id-1', { status: 'Accepted' }]);
  });
  it('generates a default response filling required enum with first value', () => {
    const fields: FieldDef[] = [
      { name: 'status', type: 'enum', required: true, enumValues: ['Accepted', 'Rejected'] },
      { name: 'interval', type: 'integer', required: true },
    ];
    const r = defaultResponse(fields);
    expect(r.status).toBe('Accepted');
    expect(typeof r.interval).toBe('number');
  });
  it('empty response fields → empty object', () => {
    expect(defaultResponse([])).toEqual({});
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/payload.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/simulator/render/payload.ts`**

```ts
import type { FieldDef } from '../model/types';

export function buildCallFrame(action: string, messageId: string, payload: Record<string, unknown>): unknown[] {
  return [2, messageId, action, payload];
}

export function buildResultFrame(messageId: string, payload: Record<string, unknown>): unknown[] {
  return [3, messageId, payload];
}

/** Generate a plausible default response payload from the response field list. */
export function defaultResponse(fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (!f.required) continue;
    switch (f.type) {
      case 'enum': out[f.name] = f.enumValues?.[0] ?? ''; break;
      case 'integer': case 'number': out[f.name] = 0; break;
      case 'boolean': out[f.name] = true; break;
      case 'datetime': out[f.name] = new Date().toISOString(); break;
      case 'json': out[f.name] = {}; break;
      default: out[f.name] = '';
    }
  }
  return out;
}
```

- [ ] **Step 4: Run to verify `payload.ts` passes**

Run: `npx vitest run tests/simulator/payload.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing test for `paramForm.ts`**

```ts
// @vitest-environment jsdom
// tests/simulator/paramForm.test.ts
import { describe, it, expect } from 'vitest';
import { renderParamForm, readForm } from '../../src/simulator/render/paramForm';
import type { FieldDef } from '../../src/simulator/model/types';

const fields: FieldDef[] = [
  { name: 'idTag', type: 'string', required: true, default: 'ABC123' },
  { name: 'connectorId', type: 'integer', required: true },
  { name: 'reason', type: 'enum', required: false, enumValues: ['Local', 'Remote'] },
  { name: 'meterValue', type: 'json', required: true },
];

describe('paramForm', () => {
  it('renders one control per field and reads typed values', () => {
    const mount = document.createElement('div');
    renderParamForm(mount, fields);
    // enum → select
    expect(mount.querySelector('select[name="reason"]')).toBeTruthy();
    // default prefilled
    expect(mount.querySelector<HTMLInputElement>('[name="idTag"]')!.value).toBe('ABC123');
    // set values and read back
    mount.querySelector<HTMLInputElement>('[name="connectorId"]')!.value = '2';
    mount.querySelector<HTMLTextAreaElement>('[name="meterValue"]')!.value = '{"a":1}';
    const payload = readForm(mount, fields);
    expect(payload).toMatchObject({ idTag: 'ABC123', connectorId: 2, meterValue: { a: 1 } });
  });

  it('omits empty optional fields', () => {
    const mount = document.createElement('div');
    renderParamForm(mount, fields);
    const payload = readForm(mount, fields);
    expect('reason' in payload).toBe(false);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run tests/simulator/paramForm.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `src/simulator/render/paramForm.ts`**

```ts
import type { FieldDef } from '../model/types';

function control(f: FieldDef): string {
  const req = f.required ? ' *' : '';
  const label = `<label class="block text-sm font-medium mb-1">${f.name}${req}</label>`;
  const help = f.description ? `<p class="text-xs text-gray-500 mt-1">${f.description}</p>` : '';
  let input: string;
  if (f.type === 'enum') {
    input = `<select name="${f.name}" class="block w-full px-3 py-2 border rounded-md">
      ${(f.enumValues ?? []).map(v => `<option value="${v}">${v}</option>`).join('')}
    </select>`;
  } else if (f.type === 'json') {
    input = `<textarea name="${f.name}" rows="6" class="block w-full px-3 py-2 border rounded-md font-mono text-xs">${f.default ?? '{}'}</textarea>`;
  } else {
    const inputType = f.type === 'integer' || f.type === 'number' ? 'number' : 'text';
    input = `<input type="${inputType}" name="${f.name}" value="${f.default ?? ''}" class="block w-full px-3 py-2 border rounded-md" />`;
  }
  return `<div class="mb-3">${label}${input}${help}</div>`;
}

export function renderParamForm(mount: HTMLElement, fields: FieldDef[]): void {
  mount.innerHTML = fields.length
    ? `<form data-role="params">${fields.map(control).join('')}</form>`
    : `<p class="text-sm text-gray-500">No parameters for this message.</p>`;
}

export function readForm(mount: HTMLElement, fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const el = mount.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${f.name}"]`);
    if (!el) continue;
    const raw = el.value?.trim() ?? '';
    if (raw === '') continue; // omit empty (optional) fields
    if (f.type === 'integer') out[f.name] = parseInt(raw, 10);
    else if (f.type === 'number') out[f.name] = Number(raw);
    else if (f.type === 'boolean') out[f.name] = raw === 'true';
    else if (f.type === 'json') { try { out[f.name] = JSON.parse(raw); } catch { out[f.name] = { error: 'Invalid JSON' }; } }
    else out[f.name] = raw;
  }
  return out;
}
```

- [ ] **Step 8: Run to verify `paramForm.ts` passes**

Run: `npx vitest run tests/simulator/paramForm.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/simulator/render/payload.ts src/simulator/render/paramForm.ts tests/simulator/payload.test.ts tests/simulator/paramForm.test.ts
git commit -m "feat(simulator): schema-driven parameter form and frame builders"
```

---

## Phase 2 — Simulator Only mode + Validation Engine wiring

### Task 2.1: Validation Engine adapter

**Files:**
- Create: `src/simulator/validate/engineAdapter.ts`
- Test: `tests/simulator/engineAdapter.test.ts`

**Interfaces:**
- Consumes: `validateMessage`, `ExchangeTracker`, `MessageResult` from `src/services/validation`.
- Produces: `validateFrame(frame: unknown[]): MessageResult`; `newTracker(): ExchangeTracker`; `formatViolations(r: MessageResult): string[]`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/simulator/engineAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { validateFrame, formatViolations } from '../../src/simulator/validate/engineAdapter';

describe('engineAdapter', () => {
  it('passes a valid Authorize Call', () => {
    const r = validateFrame([2, 'id-1', 'Authorize', { idTag: 'ABC' }]);
    expect(r.ok).toBe(true);
    expect(formatViolations(r)).toEqual([]);
  });
  it('flags a schema violation (missing required idTag)', () => {
    const r = validateFrame([2, 'id-2', 'Authorize', {}]);
    expect(r.ok).toBe(false);
    expect(formatViolations(r).join(' ')).toMatch(/idTag|required/i);
  });
  it('flags a malformed frame (L1)', () => {
    const r = validateFrame([2, 'id-3', 'Authorize']); // only 3 elements
    expect(r.ok).toBe(false);
    expect(r.violations[0].layer).toBe('L1');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/engineAdapter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/simulator/validate/engineAdapter.ts`**

```ts
import { validateMessage, ExchangeTracker } from '../../services/validation';
import type { MessageResult } from '../../services/validation';

export function validateFrame(frame: unknown[]): MessageResult {
  return validateMessage(frame);
}

export function newTracker(): ExchangeTracker {
  return new ExchangeTracker();
}

/** Human-readable violation lines for the validation panel. */
export function formatViolations(r: MessageResult): string[] {
  return r.violations.map(v => `[${v.layer}] ${v.message}${v.path ? ` (${v.path})` : ''}`);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/simulator/engineAdapter.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/simulator/validate/engineAdapter.ts tests/simulator/engineAdapter.test.ts
git commit -m "feat(simulator): validation-engine adapter"
```

### Task 2.2: Log console + payload panels

**Files:**
- Create: `src/simulator/render/logConsole.ts`
- Test: `tests/simulator/logConsole.test.ts` (jsdom)

**Interfaces:**
- Consumes: `SessionEntry` (types).
- Produces: `class LogConsole` — `constructor(mount: HTMLElement, opts?: { onAnalyze?: (entries: SessionEntry[]) => void })`, `.log(entry: SessionEntry): void`, `.clear(): void`, `.entries(): SessionEntry[]`.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
// tests/simulator/logConsole.test.ts
import { describe, it, expect, vi } from 'vitest';
import { LogConsole } from '../../src/simulator/render/logConsole';

describe('LogConsole', () => {
  it('records entries and renders SENT/RECEIVED', () => {
    const mount = document.createElement('div');
    const lc = new LogConsole(mount);
    lc.log({ ts: '2026-07-03T10:00:00Z', direction: 'sent', frame: [2, 'id', 'Heartbeat', {}] });
    lc.log({ ts: '2026-07-03T10:00:01Z', direction: 'received', frame: [3, 'id', {}] });
    expect(lc.entries()).toHaveLength(2);
    expect(mount.textContent).toMatch(/SENT/);
    expect(mount.textContent).toMatch(/RECEIVED/);
  });
  it('fires onAnalyze with recorded entries', () => {
    const mount = document.createElement('div');
    const onAnalyze = vi.fn();
    const lc = new LogConsole(mount, { onAnalyze });
    lc.log({ ts: 't', direction: 'sent', frame: [2, 'id', 'Heartbeat', {}] });
    mount.querySelector<HTMLButtonElement>('[data-role="analyze"]')!.click();
    expect(onAnalyze).toHaveBeenCalledOnce();
    expect(onAnalyze.mock.calls[0][0]).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/logConsole.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/simulator/render/logConsole.ts`**

```ts
import type { SessionEntry } from '../model/types';

export class LogConsole {
  private _entries: SessionEntry[] = [];
  private list: HTMLElement;

  constructor(private mount: HTMLElement, private opts: { onAnalyze?: (entries: SessionEntry[]) => void } = {}) {
    mount.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <h3 class="font-semibold">OCPP Message Log</h3>
        <div class="flex gap-2">
          <button data-role="analyze" class="text-sm bg-indigo-600 text-white px-3 py-1 rounded-md">Analyze in Parser</button>
          <button data-role="clear" class="text-sm bg-gray-200 px-3 py-1 rounded-md">Clear</button>
        </div>
      </div>
      <div data-role="list" class="bg-gray-900 text-white p-3 rounded-md h-64 overflow-y-auto font-mono text-xs"></div>`;
    this.list = mount.querySelector('[data-role="list"]')!;
    mount.querySelector('[data-role="clear"]')!.addEventListener('click', () => this.clear());
    mount.querySelector('[data-role="analyze"]')!.addEventListener('click', () => this.opts.onAnalyze?.(this._entries));
  }

  log(entry: SessionEntry): void {
    this._entries.push(entry);
    const tag = entry.direction === 'sent' ? 'SENT' : 'RECEIVED';
    const color = entry.direction === 'sent' ? 'text-green-400' : 'text-blue-400';
    const row = document.createElement('div');
    row.innerHTML = `<span class="text-gray-500">${entry.ts}</span> <span class="${color} font-bold">${tag.padEnd(8)}</span> ${JSON.stringify(entry.frame)}`;
    this.list.appendChild(row);
    this.list.scrollTop = this.list.scrollHeight;
  }

  clear(): void { this._entries = []; this.list.innerHTML = ''; }
  entries(): SessionEntry[] { return this._entries.slice(); }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/simulator/logConsole.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/simulator/render/logConsole.ts tests/simulator/logConsole.test.ts
git commit -m "feat(simulator): message log console with analyze hook"
```

### Task 2.3: Shell + Simulator-Only run flow (wires 1.4–2.2 together)

**Files:**
- Create: `src/simulator/render/shell.ts`
- Modify: `src/simulator/main.ts`
- Test: `tests/simulator/shell.test.ts` (jsdom)

**Interfaces:**
- Consumes: everything above (`buildCatalog`, `renderSelector`, `renderParamForm`/`readForm`, `payload` builders, `validateFrame`/`formatViolations`, `LogConsole`).
- Produces: `renderShell(root: HTMLElement): { mode: () => 'simulator' | 'cp'; container: HTMLElement }` and an internal `runSimulatorOnly(action, payload)` proven by the test.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
// tests/simulator/shell.test.ts
import { describe, it, expect } from 'vitest';
import { renderShell } from '../../src/simulator/render/shell';

describe('shell — Simulator Only', () => {
  it('validates and logs a faked exchange for a selected message', () => {
    const root = document.createElement('div');
    renderShell(root);
    // pick Authorize
    const msg = root.querySelector<HTMLSelectElement>('[data-role="message"]')!;
    msg.value = 'Authorize';
    msg.dispatchEvent(new Event('change'));
    // fill idTag
    root.querySelector<HTMLInputElement>('[name="idTag"]')!.value = 'ABC';
    // run
    root.querySelector<HTMLButtonElement>('[data-role="run"]')!.click();
    // validation success shown, and both SENT + RECEIVED logged
    expect(root.textContent).toMatch(/Valid|Success/i);
    expect(root.textContent).toMatch(/SENT/);
    expect(root.textContent).toMatch(/RECEIVED/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/shell.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/simulator/render/shell.ts`**

```ts
import { buildCatalog, getMessage } from '../catalog/buildCatalog';
import { renderSelector } from './selector';
import { renderParamForm, readForm } from './paramForm';
import { buildCallFrame, buildResultFrame, defaultResponse } from './payload';
import { validateFrame, formatViolations } from '../validate/engineAdapter';
import { LogConsole } from './logConsole';
import type { MessageResult } from '../../services/validation';

export function renderShell(root: HTMLElement): { mode: () => 'simulator' | 'cp'; container: HTMLElement } {
  root.innerHTML = `
    <div class="max-w-5xl mx-auto p-6 space-y-4">
      <h1 class="text-2xl font-bold">OCPP Simulator</h1>
      <div class="flex gap-4 items-center">
        <label><input type="radio" name="mode" value="simulator" checked /> Simulator Only</label>
        <label><input type="radio" name="mode" value="cp" /> Charge Point (CP) Mode</label>
      </div>
      <div data-role="selector"></div>
      <div data-role="form"></div>
      <button data-role="run" class="bg-indigo-600 text-white px-4 py-2 rounded-md" disabled>Run Simulation & Validate</button>
      <div data-role="validation"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <pre data-role="req" class="bg-gray-900 text-white p-3 rounded-md text-xs overflow-auto"></pre>
        <pre data-role="res" class="bg-gray-900 text-white p-3 rounded-md text-xs overflow-auto"></pre>
      </div>
      <div data-role="log"></div>
    </div>`;

  const catalog = buildCatalog();
  const form = root.querySelector<HTMLElement>('[data-role="form"]')!;
  const runBtn = root.querySelector<HTMLButtonElement>('[data-role="run"]')!;
  const valEl = root.querySelector<HTMLElement>('[data-role="validation"]')!;
  const reqEl = root.querySelector<HTMLElement>('[data-role="req"]')!;
  const resEl = root.querySelector<HTMLElement>('[data-role="res"]')!;
  const log = new LogConsole(root.querySelector('[data-role="log"]')!);
  const mode = () => (root.querySelector<HTMLInputElement>('input[name="mode"]:checked')!.value as 'simulator' | 'cp');

  let currentAction = '';
  renderSelector(root.querySelector('[data-role="selector"]')!, catalog, (action) => {
    currentAction = action;
    const def = getMessage(action)!;
    renderParamForm(form, def.request);
    runBtn.disabled = false;
  });

  function showValidation(r: MessageResult): void {
    const errs = formatViolations(r);
    valEl.innerHTML = r.ok
      ? `<div class="p-3 rounded-md bg-green-50 text-green-800">Validation: Valid</div>`
      : `<div class="p-3 rounded-md bg-red-50 text-red-800">Validation: Failed<ul class="list-disc ml-5">${errs.map(e => `<li>${e}</li>`).join('')}</ul></div>`;
  }

  runBtn.addEventListener('click', () => {
    if (!currentAction) return;
    const def = getMessage(currentAction)!;
    const payload = readForm(form, def.request);
    const callFrame = buildCallFrame(currentAction, 'sim-1', payload);
    const result = validateFrame(callFrame);
    showValidation(result);
    reqEl.textContent = JSON.stringify(callFrame, null, 2);
    if (mode() === 'simulator') {
      log.log({ ts: new Date().toISOString(), direction: 'sent', frame: callFrame });
      const res = defaultResponse(def.response);
      if (!result.ok && 'status' in res) res.status = 'Rejected';
      const resFrame = buildResultFrame('sim-1', res);
      resEl.textContent = JSON.stringify(resFrame, null, 2);
      log.log({ ts: new Date().toISOString(), direction: 'received', frame: resFrame });
    }
    // CP-mode send is added in Phase 3.
  });

  return { mode, container: root };
}
```

- [ ] **Step 4: Update `src/simulator/main.ts` to use the shell**

```ts
import { renderShell } from './render/shell';

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  renderShell(root);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/simulator/shell.test.ts`
Expected: PASS.

- [ ] **Step 6: Full check + commit**

Run: `npm run typecheck && npm run build && npm test`
Expected: all green.

```bash
git add src/simulator/render/shell.ts src/simulator/main.ts tests/simulator/shell.test.ts
git commit -m "feat(simulator): Simulator-Only run flow with engine validation"
```

---

## Phase 3 — Charge Point (CP) Mode transport

### Task 3.1: WebSocket client (injectable socket)

**Files:**
- Create: `src/simulator/transport/wsClient.ts`
- Test: `tests/simulator/wsClient.test.ts`

**Interfaces:**
- Produces:
  - `interface SocketLike { send(data: string): void; close(): void; readyState: number; onopen: (() => void) | null; onmessage: ((ev: { data: string }) => void) | null; onclose: (() => void) | null; onerror: ((e: unknown) => void) | null; }`
  - `class WsClient` — `constructor(makeSocket?: (url: string, proto: string) => SocketLike)`, `.connect(url: string, h: { onOpen?: () => void; onFrame?: (frame: unknown[]) => void; onClose?: () => void; onError?: (e: unknown) => void }): void`, `.send(frame: unknown[]): void`, `.isOpen(): boolean`, `.close(): void`.

- [ ] **Step 1: Write the failing test** (with a fake socket)

```ts
// tests/simulator/wsClient.test.ts
import { describe, it, expect, vi } from 'vitest';
import { WsClient, type SocketLike } from '../../src/simulator/transport/wsClient';

function fakeSocketFactory() {
  const socket: SocketLike & { _emit: (data: string) => void } = {
    readyState: 0,
    onopen: null, onmessage: null, onclose: null, onerror: null,
    send: vi.fn(),
    close: vi.fn(),
    _emit(data: string) { this.onmessage?.({ data }); },
  };
  return { socket, make: () => { socket.readyState = 1; queueMicrotask(() => socket.onopen?.()); return socket; } };
}

describe('WsClient', () => {
  it('connects, sends frames as JSON, and parses inbound frames', async () => {
    const { socket, make } = fakeSocketFactory();
    const client = new WsClient(make);
    const onFrame = vi.fn();
    client.connect('ws://x/CP_1', { onFrame });
    await Promise.resolve();
    client.send([2, 'id', 'Heartbeat', {}]);
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify([2, 'id', 'Heartbeat', {}]));
    socket._emit(JSON.stringify([3, 'id', { currentTime: 't' }]));
    expect(onFrame).toHaveBeenCalledWith([3, 'id', { currentTime: 't' }]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/wsClient.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/simulator/transport/wsClient.ts`**

```ts
export interface SocketLike {
  send(data: string): void;
  close(): void;
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
}

type Handlers = {
  onOpen?: () => void;
  onFrame?: (frame: unknown[]) => void;
  onClose?: () => void;
  onError?: (e: unknown) => void;
};

const OPEN = 1;

export class WsClient {
  private socket: SocketLike | null = null;

  constructor(private makeSocket: (url: string, proto: string) => SocketLike =
    (url, proto) => new WebSocket(url, proto) as unknown as SocketLike) {}

  connect(url: string, h: Handlers): void {
    const socket = this.makeSocket(url, 'ocpp1.6');
    this.socket = socket;
    socket.onopen = () => h.onOpen?.();
    socket.onclose = () => h.onClose?.();
    socket.onerror = (e) => h.onError?.(e);
    socket.onmessage = (ev) => {
      try { h.onFrame?.(JSON.parse(ev.data) as unknown[]); } catch (e) { h.onError?.(e); }
    };
  }

  send(frame: unknown[]): void {
    if (this.socket && this.socket.readyState === OPEN) this.socket.send(JSON.stringify(frame));
  }

  isOpen(): boolean { return this.socket?.readyState === OPEN; }
  close(): void { this.socket?.close(); }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/simulator/wsClient.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/simulator/transport/wsClient.ts tests/simulator/wsClient.test.ts
git commit -m "feat(simulator): injectable WebSocket client for CP mode"
```

### Task 3.2: Wire CP Mode into the shell (connect panel, send, listen/respond, heartbeat)

**Files:**
- Modify: `src/simulator/render/shell.ts`
- Test: extend `tests/simulator/shell.test.ts`

**Interfaces:**
- Consumes: `WsClient` (3.1), `ExchangeTracker` via `newTracker` (2.1), `getMessage` (1.4).
- Produces: CP-Mode behavior — a connection panel visible only in CP Mode; in CP Mode the Run button sends a real frame via `WsClient`; inbound frames are logged and (for CS→CP Calls) populate a response form.

- [ ] **Step 1: Write the failing test** (inject a fake socket via a test hook)

```ts
// @vitest-environment jsdom
// append to tests/simulator/shell.test.ts
import { vi } from 'vitest';

it('CP Mode: connection panel toggles and a sent frame goes over the socket', () => {
  const sent: string[] = [];
  const fakeSocket = {
    readyState: 1, onopen: null as null | (() => void), onmessage: null as null | ((e: { data: string }) => void),
    onclose: null, onerror: null,
    send: (d: string) => sent.push(d), close: () => {},
  };
  const { renderShell } = require('../../src/simulator/render/shell');
  const root = document.createElement('div');
  renderShell(root, { makeSocket: () => { queueMicrotask(() => fakeSocket.onopen?.()); return fakeSocket as any; } });

  // switch to CP mode → connection panel appears
  const cp = root.querySelector<HTMLInputElement>('input[name="mode"][value="cp"]')!;
  cp.checked = true; cp.dispatchEvent(new Event('change'));
  expect(root.querySelector('[data-role="connect-panel"]')!.classList.contains('hidden')).toBe(false);

  // connect
  root.querySelector<HTMLInputElement>('[data-role="ws-url"]')!.value = 'ws://x/CP_1';
  root.querySelector<HTMLButtonElement>('[data-role="connect"]')!.click();

  // pick Authorize (CP→CS), fill, send
  const msg = root.querySelector<HTMLSelectElement>('[data-role="message"]')!;
  msg.value = 'Authorize'; msg.dispatchEvent(new Event('change'));
  root.querySelector<HTMLInputElement>('[name="idTag"]')!.value = 'ABC';
  root.querySelector<HTMLButtonElement>('[data-role="run"]')!.click();
  expect(sent.some(s => s.includes('Authorize'))).toBe(true);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/shell.test.ts`
Expected: FAIL — `renderShell` does not accept options / no connect panel.

- [ ] **Step 3: Modify `renderShell` in `src/simulator/render/shell.ts`**

Change the signature and add CP-mode wiring:

```ts
import { WsClient, type SocketLike } from '../transport/wsClient';
// ...existing imports...

export function renderShell(
  root: HTMLElement,
  opts: { makeSocket?: (url: string, proto: string) => SocketLike } = {},
): { mode: () => 'simulator' | 'cp'; container: HTMLElement } {
```

Add a connection panel to the template (after the mode radios):

```html
<div data-role="connect-panel" class="hidden border-t pt-3">
  <input data-role="ws-url" type="text" placeholder="wss://csms.example.com/CP_001" class="px-3 py-2 border rounded-md w-full md:w-96" />
  <button data-role="connect" class="bg-blue-600 text-white px-4 py-2 rounded-md">Connect</button>
  <button data-role="heartbeat" class="bg-gray-500 text-white px-4 py-2 rounded-md" disabled>Start Heartbeat</button>
  <span data-role="status" class="ml-2 text-sm">Disconnected</span>
</div>
```

Add after the existing wiring (before `return`):

```ts
const client = new WsClient(opts.makeSocket);
const tracker = newTracker();
const panel = root.querySelector<HTMLElement>('[data-role="connect-panel"]')!;
const statusEl = root.querySelector<HTMLElement>('[data-role="status"]')!;
const hbBtn = root.querySelector<HTMLButtonElement>('[data-role="heartbeat"]')!;
let hbTimer: ReturnType<typeof setInterval> | null = null;

root.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach(r =>
  r.addEventListener('change', () => panel.classList.toggle('hidden', mode() !== 'cp')));

root.querySelector<HTMLButtonElement>('[data-role="connect"]')!.addEventListener('click', () => {
  const url = root.querySelector<HTMLInputElement>('[data-role="ws-url"]')!.value.trim();
  if (!/^wss?:\/\//.test(url)) { statusEl.textContent = 'Enter a ws:// or wss:// URL'; return; }
  statusEl.textContent = 'Connecting…';
  client.connect(url, {
    onOpen: () => { statusEl.textContent = 'Connected'; hbBtn.disabled = false; },
    onClose: () => { statusEl.textContent = 'Disconnected'; hbBtn.disabled = true; if (hbTimer) { clearInterval(hbTimer); hbTimer = null; } },
    onError: () => { statusEl.textContent = 'Error'; },
    onFrame: (frame) => {
      tracker.add(frame, new Date().toISOString());
      log.log({ ts: new Date().toISOString(), direction: 'received', frame });
      resEl.textContent = JSON.stringify(frame, null, 2);
    },
  });
});

hbBtn.addEventListener('click', () => {
  if (hbTimer) { clearInterval(hbTimer); hbTimer = null; hbBtn.textContent = 'Start Heartbeat'; return; }
  hbBtn.textContent = 'Stop Heartbeat';
  hbTimer = setInterval(() => {
    const frame = buildCallFrame('Heartbeat', crypto.randomUUID(), {});
    tracker.add(frame, new Date().toISOString());
    client.send(frame);
    log.log({ ts: new Date().toISOString(), direction: 'sent', frame });
  }, 30000);
});
```

In the existing `runBtn` click handler, extend the CP branch (replace the `// CP-mode send is added in Phase 3.` comment):

```ts
else { // CP mode
  if (result.ok && client.isOpen()) {
    const id = crypto.randomUUID();
    const frame = buildCallFrame(currentAction, id, payload);
    tracker.add(frame, new Date().toISOString());
    client.send(frame);
    log.log({ ts: new Date().toISOString(), direction: 'sent', frame });
    resEl.textContent = 'Waiting for server response…';
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/simulator/shell.test.ts`
Expected: PASS (all shell tests).

- [ ] **Step 5: Full check + commit**

Run: `npm run typecheck && npm run build && npm test`
Expected: all green.

```bash
git add src/simulator/render/shell.ts tests/simulator/shell.test.ts
git commit -m "feat(simulator): CP Mode — connect, send, listen, heartbeat via engine tracker"
```

---

## Phase 4 — Session → Parser handoff (R4)

### Task 4.1: Session-to-Parser adapter

**Files:**
- Create: `src/simulator/session/toParser.ts`
- Test: `tests/simulator/toParser.test.ts`

**Interfaces:**
- Consumes: `SessionEntry` (types), `analyzeLogLines` from `src/app/analyze`.
- Produces: `sessionToLogLines(entries: SessionEntry[]): string[]`; `analyzeSession(entries: SessionEntry[], name?: string): ReturnType<typeof analyzeLogLines>`.

- [ ] **Step 1: Write the failing test** (round-trip a Start→Stop transaction)

```ts
// tests/simulator/toParser.test.ts
import { describe, it, expect } from 'vitest';
import { sessionToLogLines, analyzeSession } from '../../src/simulator/session/toParser';
import type { SessionEntry } from '../../src/simulator/model/types';

describe('session → Parser', () => {
  it('formats lines the Parser regex accepts', () => {
    const lines = sessionToLogLines([
      { ts: '2026-07-03T10:00:00Z', direction: 'sent', frame: [2, 'id', 'Heartbeat', {}] },
      { ts: '2026-07-03T10:00:01Z', direction: 'received', frame: [3, 'id', {}] },
    ]);
    expect(lines[0]).toBe('[2026-07-03T10:00:00Z] >> message sent: [2,"id","Heartbeat",{}]');
    expect(lines[1]).toBe('[2026-07-03T10:00:01Z] << message received: [3,"id",{}]');
  });

  it('a Start→Stop session yields one analyzed transaction', () => {
    const entries: SessionEntry[] = [
      { ts: '2026-07-03T10:00:00Z', direction: 'sent', frame: [2, 's1', 'StartTransaction', { connectorId: 1, idTag: 'ABC', meterStart: 1000, timestamp: '2026-07-03T10:00:00Z' }] },
      { ts: '2026-07-03T10:00:00Z', direction: 'received', frame: [3, 's1', { transactionId: 555, idTagInfo: { status: 'Accepted' } }] },
      { ts: '2026-07-03T10:05:00Z', direction: 'sent', frame: [2, 'e1', 'StopTransaction', { transactionId: 555, meterStop: 5000, timestamp: '2026-07-03T10:05:00Z' }] },
      { ts: '2026-07-03T10:05:00Z', direction: 'received', frame: [3, 'e1', {}] },
    ];
    const result = analyzeSession(entries);
    expect(result.transactions.length).toBe(1);
    expect(result.transactions[0].transactionId).toBe(555);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/toParser.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/simulator/session/toParser.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/simulator/toParser.test.ts`
Expected: PASS (2 tests).

> If `result.transactions[0]` has a different property name than `transactionId`, read `src/app/analyze.ts`'s `AnalysisResult`/`Transaction` type and adjust the assertion to the real field — do NOT change the Parser.

- [ ] **Step 5: Commit**

```bash
git add src/simulator/session/toParser.ts tests/simulator/toParser.test.ts
git commit -m "feat(simulator): session → Parser log-line adapter (R4)"
```

### Task 4.2: Wire "Analyze in Parser" into the shell

**Files:**
- Modify: `src/simulator/render/shell.ts`
- Test: extend `tests/simulator/shell.test.ts`

**Interfaces:**
- Consumes: `analyzeSession` (4.1), `renderResults` from `src/app/render/renderResults`, `LogConsole` `onAnalyze` hook (2.2).
- Produces: clicking "Analyze in Parser" renders the Parser analysis of the current session into a results container.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
// append to tests/simulator/shell.test.ts
it('Analyze in Parser renders results from the logged session', () => {
  const { renderShell } = require('../../src/simulator/render/shell');
  const root = document.createElement('div');
  renderShell(root);
  // run a Simulator-Only Authorize to populate the log
  const msg = root.querySelector<HTMLSelectElement>('[data-role="message"]')!;
  msg.value = 'Authorize'; msg.dispatchEvent(new Event('change'));
  root.querySelector<HTMLInputElement>('[name="idTag"]')!.value = 'ABC';
  root.querySelector<HTMLButtonElement>('[data-role="run"]')!.click();
  // analyze
  root.querySelector<HTMLButtonElement>('[data-role="analyze"]')!.click();
  expect(root.querySelector('[data-role="parser-results"]')!.children.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/simulator/shell.test.ts`
Expected: FAIL — no parser-results container / no analyze wiring.

- [ ] **Step 3: Modify `shell.ts`**

Add a results container to the template (after the log):

```html
<div data-role="parser-results" class="mt-4"></div>
```

Import and wire the analyze hook — change the `LogConsole` construction:

```ts
import { analyzeSession } from '../session/toParser';
import { renderResults } from '../../app/render/renderResults';
// ...
const resultsEl = root.querySelector<HTMLElement>('[data-role="parser-results"]')!;
const log = new LogConsole(root.querySelector('[data-role="log"]')!, {
  onAnalyze: (entries) => {
    resultsEl.innerHTML = '';
    const result = analyzeSession(entries);
    renderResults(resultsEl, result);
  },
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/simulator/shell.test.ts`
Expected: PASS.

> If `renderResults`'s signature differs (e.g. returns a node instead of mounting), read `src/app/render/renderResults.ts` and adapt the call — do NOT change the Parser.

- [ ] **Step 5: Full check + commit**

Run: `npm run typecheck && npm run build && npm test`
Expected: all green.

```bash
git add src/simulator/render/shell.ts tests/simulator/shell.test.ts
git commit -m "feat(simulator): analyze a simulated session in the Parser (R4 end-to-end)"
```

---

## Phase 5 — Training niceties (optional, after core is proven)

> These are additive polish. Each is independently shippable; do them only if wanted.

### Task 5.1: Training defaults + descriptions overlay

**Files:**
- Modify: `src/simulator/catalog/metadata.ts` (add optional `defaults?: Record<string,string>` and `description?: string` per action)
- Modify: `src/simulator/catalog/buildCatalog.ts` (apply overlay onto `FieldDef.default` / `FieldDef.description`)
- Test: extend `tests/simulator/buildCatalog.test.ts` (assert a seeded default e.g. `Authorize.idTag` default is present)

- [ ] Add a `TRAINING_OVERLAY` map (seed a handful: `Authorize.idTag='ABC123'`, `BootNotification.chargePointVendor='Ador'`, etc.), apply it in `buildCatalog` after `fieldsFromSchema`, test one, commit.

### Task 5.2: Per-profile "lesson" grouping in the UI

**Files:**
- Modify: `src/simulator/render/selector.ts` (add a short profile description banner when a profile is chosen)
- Test: extend `tests/simulator/selector.test.ts`

- [ ] Add a `PROFILE_BLURB: Record<Profile,string>`, render it under the profile picker, test text appears, commit.

### Task 5.3: Update trackers + docs

**Files:**
- Modify: `specs/roadmap.md` (add Charger Emulator / OCPP Simulator row → In build), `skills/WORKFLOW.md` (new feature block), `knowledge/project-journal.md` (session entry), `CLAUDE.md` status line, `docs/md-registry.md` if any new MD added.

- [ ] Update each tracker to reflect the simulator is built, commit.

---

## Self-Review

**Spec coverage (R1–R8 + design §):**
- R1 both modes — Phase 2 (Simulator Only) + Phase 3 (CP Mode). ✓
- R2 validate via engine — Task 2.1 + used in 2.3/3.2. ✓
- R3 frames engine-shaped — `payload.ts` builders + `validateFrame`. ✓
- R4 session → Parser — Phase 4. ✓
- R5 offline Simulator Only — Task 2.3 (no network path). ✓
- R6 all 28 — Task 1.3/1.4 (ACTIONS length 28 test). ✓
- R7 categorized — Task 1.5 selector (profile + direction filter). ✓
- R8 schema-driven — Task 1.2/1.4 (from `OCPP16.schemas`). ✓
- Design §4 file moves — Task 0.2. ✓ · Design §4 MPA entry — Task 0.1. ✓

**Placeholder scan:** every code step contains real code; no TBD/TODO. Two "if the shape differs, read X and adapt" notes (Tasks 4.1/4.2) are deliberate guards against the two in-repo APIs whose exact field names weren't verified — they point at the file to read, not a placeholder.

**Type consistency:** `MessageDef`/`FieldDef`/`SessionEntry` defined in 1.1 and consumed unchanged; `validateFrame`/`newTracker`/`formatViolations` (2.1) reused verbatim in 2.3/3.2; `buildCallFrame`/`buildResultFrame`/`defaultResponse` (1.6) reused in 2.3/3.2; `LogConsole` API (2.2) reused in 2.3/4.2; `WsClient` (3.1) reused in 3.2; `analyzeSession` (4.1) reused in 4.2. Consistent.

**Open risks carried from the design:** Parser `Transaction.transactionId` field name and `renderResults` signature are the two spots to verify against `src/app` during Phase 4 (guarded in-task).
