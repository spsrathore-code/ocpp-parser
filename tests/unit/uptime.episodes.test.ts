import { describe, it, expect } from 'vitest';
import { buildEpisodes, communicationTimeoutFor, heartbeatIntervalOf } from '../../src/app/uptime/episodes';
import { DEFAULT_UPTIME_OPTIONS, type ExtractRow } from '../../src/app/uptime/types';

const T0 = Date.UTC(2026, 7, 11, 0, 0, 0);
const at = (sec: number): number => T0 + sec * 1000;

let seq = 0;
function base(): ExtractRow {
  return {
    sourceRow: ++seq, site: 'DC052', eventName: '', timestampUtc: null, respCurrentTimeUtc: null,
    connectorId: null, status: '', errorCode: '', vendorErrorCode: '', info: '', reason: '',
    firmwareVersion: '', chargePointVendor: '', heartbeatIntervalSec: null,
    requestLen: 0, truncated: false, isFaultStatus: false,
  };
}

/** A faulted StatusNotification at `sec`. */
function fault(sec: number, info: string, connectorId = 1, errorCode = 'OtherError'): ExtractRow {
  return { ...base(), eventName: 'StatusNotification', timestampUtc: at(sec), connectorId, status: 'Faulted', errorCode, vendorErrorCode: '17', info, isFaultStatus: true };
}

/** The healthy StatusNotification that closes an episode. */
function noError(sec: number, connectorId = 1): ExtractRow {
  return { ...base(), eventName: 'StatusNotification', timestampUtc: at(sec), connectorId, status: 'Available', errorCode: 'NoError' };
}

function heartbeat(sec: number): ExtractRow {
  return { ...base(), eventName: 'Heartbeat', respCurrentTimeUtc: at(sec) };
}

function boot(sec: number, intervalSec: number | null = null): ExtractRow {
  return { ...base(), eventName: 'BootNotification', respCurrentTimeUtc: at(sec), heartbeatIntervalSec: intervalSec };
}

/** Most tests pin an explicit timeout; the derived default has its own block. */
const opts = { ...DEFAULT_UPTIME_OPTIONS, communicationTimeoutSec: 180 };

describe('fault episode clustering (300 s)', () => {
  it('collapses a fault re-reported inside the window into ONE episode', () => {
    // A charger re-reporting the same fault every few seconds is one outage.
    const eps = buildEpisodes([fault(0, 'EVCOM'), fault(30, 'EVCOM'), fault(120, 'EVCOM'), noError(600)], opts);
    expect(eps).toHaveLength(1);
    expect(eps[0].startUtc).toBe(at(0));
  });

  it('starts a new episode once the gap exceeds the window', () => {
    const eps = buildEpisodes([fault(0, 'EVCOM'), fault(400, 'EVCOM'), noError(600)], opts);
    expect(eps).toHaveLength(2);
  });

  it('treats exactly 300 s as still within the cluster, and 301 s as a new episode', () => {
    expect(buildEpisodes([fault(0, 'EVCOM'), fault(300, 'EVCOM')], opts)).toHaveLength(1);
    expect(buildEpisodes([fault(0, 'EVCOM'), fault(301, 'EVCOM')], opts)).toHaveLength(2);
  });

  it('clusters per connector — the same fault on another connector is its own episode', () => {
    const eps = buildEpisodes([fault(0, 'EVCOM', 1), fault(30, 'EVCOM', 2)], opts);
    expect(eps).toHaveLength(2);
  });

  it('clusters per fault text — a different info within the window is its own episode', () => {
    const eps = buildEpisodes([fault(0, 'EVCOM', 1), fault(30, 'GroundFault', 1)], opts);
    expect(eps).toHaveLength(2);
  });

  it('keys on info, NOT errorCode — the same fault text is logged under different codes', () => {
    // ErrorCode_Comparison proves EVCOM appears as both OtherError and
    // EVCommunicationError on the same charger. Keying on errorCode would
    // split one real outage into two.
    const eps = buildEpisodes([fault(0, 'EVCOM', 1, 'OtherError'), fault(30, 'EVCOM', 1, 'EVCommunicationError')], opts);
    expect(eps).toHaveLength(1);
  });

  it('honours a caller-supplied clustering window', () => {
    const eps = buildEpisodes([fault(0, 'EVCOM'), fault(30, 'EVCOM')], { ...opts, clusteringWindowSec: 10 });
    expect(eps).toHaveLength(2);
  });
});

describe('episode end — the next NoError on the same connector', () => {
  it('closes at the first NoError after the fault', () => {
    const eps = buildEpisodes([fault(0, 'EVCOM', 1), noError(100, 1), noError(200, 1)], opts);
    expect(eps[0].endUtc).toBe(at(100));
    expect(eps[0].derivation).toBe('fault');
  });

  it('ignores a NoError on a different connector', () => {
    const eps = buildEpisodes([fault(0, 'EVCOM', 1), noError(100, 2), noError(300, 1)], opts);
    expect(eps[0].endUtc).toBe(at(300));
  });

  it('ignores a NoError that precedes the fault', () => {
    const eps = buildEpisodes([noError(0, 1), fault(100, 'EVCOM', 1)], opts);
    expect(eps[0].endUtc).toBeNull();
  });

  it('leaves an episode unresolved when the log ends first — never a zero duration', () => {
    // Unresolved episodes are excluded from every sum, so downtime is
    // understated. That must be visible, not silently rendered as 0.
    const eps = buildEpisodes([fault(0, 'EVCOM', 1)], opts);
    expect(eps[0].endUtc).toBeNull();
  });
});

// PowerFailure measures how long the connector stayed unusable: from the
// Faulted notification until that same connector reports Finishing or Available.
describe('PowerFailure — notification until the connector is usable again', () => {
  /** A StatusNotification reporting the connector usable again. */
  const recovered = (sec: number, status: string, connectorId = 1): ExtractRow => ({
    ...base(), eventName: 'StatusNotification', timestampUtc: at(sec), connectorId,
    status, errorCode: 'NoError',
  });

  it('starts at the notification, not at the last heartbeat before it', () => {
    const eps = buildEpisodes([heartbeat(0), fault(300, 'PowerFailure'), recovered(900, 'Available')], opts);
    expect(eps[0].startUtc).toBe(at(300));
    expect(eps[0].derivation).toBe('powerFailure');
  });

  it('ends at the next Available on the same connector', () => {
    const eps = buildEpisodes([fault(300, 'PowerFailure', 1), recovered(900, 'Available', 1)], opts);
    expect(eps[0].endUtc).toBe(at(900));
  });

  it('ends at Finishing just as readily as Available', () => {
    const eps = buildEpisodes([fault(300, 'PowerFailure', 1), recovered(600, 'Finishing', 1)], opts);
    expect(eps[0].endUtc).toBe(at(600));
  });

  it('takes whichever recovery comes first', () => {
    const eps = buildEpisodes([
      fault(300, 'PowerFailure', 1), recovered(600, 'Finishing', 1), recovered(900, 'Available', 1),
    ], opts);
    expect(eps[0].endUtc).toBe(at(600));
  });

  it('ignores a recovery on a different connector', () => {
    // A sibling connector coming back says nothing about this one.
    const eps = buildEpisodes([
      fault(300, 'PowerFailure', 1), recovered(600, 'Available', 2), recovered(900, 'Available', 1),
    ], opts);
    expect(eps[0].endUtc).toBe(at(900));
  });

  it('ignores a recovery that precedes the notification', () => {
    const eps = buildEpisodes([recovered(100, 'Available', 1), fault(300, 'PowerFailure', 1)], opts);
    expect(eps[0].endUtc).toBeNull();
  });

  it('carries a real duration — it is no longer a zero-duration marker', () => {
    const eps = buildEpisodes([fault(300, 'PowerFailure', 1), recovered(800, 'Available', 1)], opts);
    expect(eps[0].endUtc! - eps[0].startUtc).toBe(500_000);
  });

  it('applies the same rule to EmergencyPressed and InputUnderVoltage', () => {
    for (const info of ['EmergencyPressed', 'InputUnderVoltage']) {
      const eps = buildEpisodes([fault(300, info, 1), recovered(800, 'Available', 1)], opts);
      expect(eps[0].derivation).toBe('powerFailure');
      expect(eps[0].endUtc).toBe(at(800));
    }
  });

  it('does NOT let an unrelated fault close the episode, even if it says Finishing', () => {
    // "Finishing/OtherError/EVCOM" is another fault being reported while a
    // session winds down, not this connector recovering. Counting it cut
    // EmergencyPressed on DC052 from 2:32:45 to 0:45:14.
    const otherFault: ExtractRow = {
      ...base(), eventName: 'StatusNotification', timestampUtc: at(400), connectorId: 1,
      status: 'Finishing', errorCode: 'OtherError', info: 'EVCOM', isFaultStatus: true,
    };
    const eps = buildEpisodes([
      fault(300, 'EmergencyPressed', 1), otherFault, recovered(900, 'Available', 1),
    ], opts);
    expect(eps[0].endUtc).toBe(at(900));
  });

  it('leaves other fault texts on the NoError rule', () => {
    const eps = buildEpisodes([fault(300, 'EVCOM', 1), noError(600, 1)], opts);
    expect(eps[0].derivation).toBe('fault');
    expect(eps[0].endUtc).toBe(at(600));
  });

  it('only a Faulted row opens a recovery-closed episode', () => {
    const informational: ExtractRow = {
      ...base(), eventName: 'StatusNotification', timestampUtc: at(300), connectorId: 1,
      status: 'Finishing', errorCode: 'OtherError', info: 'PowerFailure', isFaultStatus: true,
    };
    const eps = buildEpisodes([informational], opts);
    expect(eps[0].derivation).toBe('fault');
  });
});

// Offline Without Error, per "Power Failure / Offline Without Error Downtime
// Logic". A communication loss that is NOT a power failure:
//   START = last charger-originated message + communication timeout
//   END   = the BootNotification that restores communication
// PowerFailure takes priority: silence inside an active PowerFailure belongs to
// that event, never to Offline.
describe('Offline without error', () => {
  const meterValues = (sec: number): ExtractRow =>
    ({ ...base(), eventName: 'MeterValues', timestampUtc: at(sec) });
  const available = (sec: number, connectorId = 1): ExtractRow => ({
    ...base(), eventName: 'StatusNotification', timestampUtc: at(sec), connectorId,
    status: 'Available', errorCode: 'NoError',
  });
  const offlines = (rows: ExtractRow[], o = opts) =>
    buildEpisodes(rows, o).filter((e) => e.derivation === 'offline');

  it('ignores a gap shorter than the communication timeout', () => {
    // A normal delay between heartbeats is not an outage.
    expect(offlines([heartbeat(0), boot(100)])).toHaveLength(0);
  });

  it('starts the window at last communication PLUS the timeout', () => {
    // The timeout itself is not downtime — it is how long we wait before
    // calling the silence an outage.
    const [e] = offlines([heartbeat(0), boot(600)]);
    expect(e.startUtc).toBe(at(180));
    expect(e.endUtc).toBe(at(600));
  });

  it('honours a caller-supplied timeout', () => {
    const [e] = offlines([heartbeat(0), boot(600)], { ...opts, communicationTimeoutSec: 60 });
    expect(e.startUtc).toBe(at(60));
  });

  it('counts ANY charger message as liveness, not just heartbeats', () => {
    // Transaction traffic is intermittent, but it still proves the charger
    // was talking.
    const [e] = offlines([heartbeat(0), meterValues(300), boot(900)]);
    expect(e.startUtc).toBe(at(300 + 180));
  });

  // Example A from the document.
  it('gives the whole silence to PowerFailure when the event is still open', () => {
    const eps = buildEpisodes([
      fault(0, 'PowerFailure', 1), heartbeat(100), heartbeat(600),
      boot(1200), available(1300, 1),
    ], opts);
    expect(eps.filter((e) => e.derivation === 'offline')).toHaveLength(0);
    const pf = eps.find((e) => e.info === 'PowerFailure')!;
    expect(pf.startUtc).toBe(at(0));
    expect(pf.endUtc).toBe(at(1300));
  });

  // Example C from the document.
  it('counts a separate Offline once the PowerFailure has already recovered', () => {
    const eps = buildEpisodes([
      fault(0, 'PowerFailure', 1), heartbeat(300), available(1200, 1),
      heartbeat(1320), heartbeat(1440), boot(2400),
    ], opts);
    const pf = eps.find((e) => e.info === 'PowerFailure')!;
    expect(pf.endUtc).toBe(at(1200));
    const off = eps.filter((e) => e.derivation === 'offline');
    expect(off).toHaveLength(1);
    expect(off[0].startUtc).toBe(at(1440 + 180));
    expect(off[0].endUtc).toBe(at(2400));
  });

  it('measures the gap from the PowerFailure recovery, which is itself traffic', () => {
    // A recovery StatusNotification is a message, so it resets liveness. The
    // Offline window therefore starts a timeout after the PowerFailure ended,
    // never inside it — the two can never overlap for the same boot.
    const eps = buildEpisodes([
      heartbeat(0), fault(60, 'PowerFailure', 1), available(600, 1), boot(3000),
    ], opts);
    const off = eps.filter((e) => e.derivation === 'offline');
    expect(off).toHaveLength(1);
    expect(off[0].startUtc).toBe(at(600 + 180));
    expect(off[0].endUtc).toBe(at(3000));
  });

  it('marks the synthesized status as explicitly not an OCPP status', () => {
    expect(offlines([heartbeat(0), boot(600)])[0].status)
      .toBe('n/a (synthesized, not an OCPP status)');
  });

  it('produces nothing when the charger never boots', () => {
    expect(offlines([heartbeat(0), heartbeat(600)])).toHaveLength(0);
  });
});

describe('output ordering', () => {
  it('returns episodes sorted by start, faults and Offline windows interleaved', () => {
    // The boot at +900 follows 850s of silence, so it yields an Offline window
    // starting a timeout after the last message.
    const eps = buildEpisodes([heartbeat(0), fault(50, 'EVCOM'), boot(900), fault(1500, 'GroundFault')], opts);
    expect(eps.map((e) => e.startUtc)).toEqual([at(50), at(50 + 180), at(1500)]);
  });

  it('does not invent an Offline window for a boot that follows normal traffic', () => {
    // 100s of silence is inside the 180s timeout — a quick restart, not an outage.
    const eps = buildEpisodes([heartbeat(0), fault(50, 'EVCOM'), boot(100)], opts);
    expect(eps.filter((e) => e.derivation === 'offline')).toHaveLength(0);
  });
});

// The CMS tells each charger how often to report in, via BootNotification.conf
// `interval`. That is the only authoritative source for what "too quiet" means
// for THAT unit, so the timeout is derived from it rather than fixed fleet-wide.
describe('communication timeout derived from BootNotification', () => {
  const auto = { ...DEFAULT_UPTIME_OPTIONS, communicationTimeoutSec: null };

  it('reads the interval the CMS assigned', () => {
    expect(heartbeatIntervalOf([boot(0, 120)])).toBe(120);
  });

  it('takes the median when a charger is reconfigured mid-log', () => {
    // The interval it ran on for most of the period is the one to judge by.
    expect(heartbeatIntervalOf([boot(0, 60), boot(1, 120), boot(2, 120)])).toBe(120);
  });

  it('allows one and a half beats before calling silence an outage', () => {
    // 120s heartbeats -> 180s, matching the reference example. Ordinary jitter
    // must never read as downtime.
    expect(communicationTimeoutFor([boot(0, 120)], auto)).toBe(180);
    expect(communicationTimeoutFor([boot(0, 300)], auto)).toBe(450);
  });

  it('falls back when the log carries no BootNotification to learn from', () => {
    expect(communicationTimeoutFor([heartbeat(0)], auto)).toBe(180);
  });

  it('lets an explicit setting override the derived value', () => {
    expect(communicationTimeoutFor([boot(0, 120)], { ...auto, communicationTimeoutSec: 600 })).toBe(600);
  });

  it('applies the derived timeout when building Offline windows', () => {
    // 300s interval -> 450s timeout, so a 400s gap is silence, not an outage.
    const short = buildEpisodes([heartbeat(0), boot(400, 300)], auto);
    expect(short.filter((e) => e.derivation === 'offline')).toHaveLength(0);
    const long = buildEpisodes([heartbeat(0), boot(1000, 300)], auto);
    const [window] = long.filter((e) => e.derivation === 'offline');
    expect(window.startUtc).toBe(at(450));
  });
});
