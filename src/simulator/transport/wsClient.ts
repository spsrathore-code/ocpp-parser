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
