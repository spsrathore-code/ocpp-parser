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
