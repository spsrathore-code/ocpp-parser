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
