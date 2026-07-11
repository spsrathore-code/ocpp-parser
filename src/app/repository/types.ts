// Log Repository schema (requirements.md § 12.2 / FR-172). `content` holds the
// gzip-compressed raw log text; every other field is indexed (FR-178).

export interface RepoMeta {
  id?: number;
  filename: string;
  savedAt: number;            // UTC epoch ms
  fileSize: number;           // raw bytes pre-compression
  evseIp: string;             // '' for file uploads
  siteName: string;
  tags: string[];
  driveFileId: string | null; // null until Drive sync (parked to Phase 5)
  source: 'upload' | 'api';
}

export interface RepoEntry extends RepoMeta {
  content: ArrayBuffer;       // gzip-compressed raw log text
}

export interface SaveInput {
  filename: string;
  fileSize: number;
  evseIp?: string;
  siteName?: string;
  tags?: string[];
  source?: 'upload' | 'api';
}
