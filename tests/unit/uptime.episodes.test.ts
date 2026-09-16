import { describe, it, expect } from 'vitest';
import { buildEpisodes } from '../../src/app/uptime/episodes';
import { DEFAULT_UPTIME_OPTIONS, type ExtractRow } from '../../src/app/uptime/types';

const T0 = Date.UTC(2026, 7, 11, 0, 0, 0);
const at = (sec: number): number => T0 + sec * 1000;

let seq = 0;
function base(): ExtractRow {
  return {
    sourceRow: ++seq, site: 'DC052', eventName: '', timestampUtc: null, respCurrentTimeUtc: null,
    connectorId: null, status: '', errorCode: '', vendorErrorCode: '', info: '', reason: '',
    firmwareVersion: '', chargePointVendor: '', requestLen: 0, truncated: false, isFaultStatus: false,
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

function boot(sec: number): ExtractRow {
  return { ...base(), eventName: 'BootNotification', respCurrentTimeUtc: at(sec) };
}

const opts = DEFAULT_UPTIME_OPTIONS;

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

describe('synthesized Offline windows', () => {
  it('derives one window per BootNotification, bounded by the last Heartbeat', () => {
    // These windows are not logged anywhere — every boot implies the charger
    // was unreachable before it. On DC052 this is the largest single component.
    const eps = buildEpisodes([heartbeat(0), heartbeat(120), boot(600)], opts);
    expect(eps).toHaveLength(1);
    expect(eps[0]).toMatchObject({ connectorId: 0, info: 'Offline', errorCode: 'Offline', derivation: 'offline' });
    expect(eps[0].startUtc).toBe(at(120));
    expect(eps[0].endUtc).toBe(at(600));
  });

  it('skips a boot with no preceding Heartbeat — the window has no lower bound', () => {
    // This is why the reference run yields 29 Offline windows from 32 boots.
    expect(buildEpisodes([boot(600)], opts)).toHaveLength(0);
  });

  it('bounds each boot by the heartbeat nearest before it, not the first one', () => {
    const eps = buildEpisodes([heartbeat(0), boot(100), heartbeat(200), boot(300)], opts);
    expect(eps.map((e) => [e.startUtc, e.endUtc])).toEqual([[at(0), at(100)], [at(200), at(300)]]);
  });

  it('marks the synthesized status as explicitly not an OCPP status', () => {
    const eps = buildEpisodes([heartbeat(0), boot(100)], opts);
    expect(eps[0].status).toBe('n/a (synthesized, not an OCPP status)');
  });
});

describe('output ordering', () => {
  it('returns episodes sorted by start, faults and Offline windows interleaved', () => {
    const eps = buildEpisodes([heartbeat(0), fault(50, 'EVCOM'), boot(100), fault(500, 'GroundFault')], opts);
    expect(eps.map((e) => e.startUtc)).toEqual([at(0), at(50), at(500)]);
  });
});
