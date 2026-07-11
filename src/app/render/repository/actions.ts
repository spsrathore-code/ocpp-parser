// Delete + bulk-delete actions (FR-191/355). Each confirms, mutates IndexedDB
// via the repository service, then triggers a panel refresh.

import { deleteFromRepo, listRepoMeta } from '../../repository/repository';
import { refreshRepository } from './panel';

type ConfirmFn = (msg: string) => boolean;
const ask: ConfirmFn = (msg) => window.confirm(msg);

export async function deleteRepoEntry(id: number, confirmFn: ConfirmFn = ask): Promise<boolean> {
  if (!confirmFn('Delete this log from the browser repository? This cannot be undone.')) return false;
  // 4c: if the entry has a driveFileId, also offer "Also delete from Google Drive?" here (FR-192).
  await deleteFromRepo(id);
  await refreshRepository();
  return true;
}

export async function deleteSelectedRepoEntries(ids: number[], confirmFn: ConfirmFn = ask): Promise<number> {
  if (ids.length === 0) return 0;
  if (!confirmFn(`Delete ${ids.length} selected log(s) from the browser repository?`)) return 0;
  for (const id of ids) await deleteFromRepo(id);
  await refreshRepository();
  return ids.length;
}

export async function deleteAllBrowserLogs(confirmFn: ConfirmFn = ask): Promise<number> {
  const all = await listRepoMeta();
  if (all.length === 0) return 0;
  if (!confirmFn(`Clear ALL ${all.length} browser-stored logs? (Cloud copies, when present, are left intact.)`)) return 0;
  for (const m of all) await deleteFromRepo(m.id as number);
  await refreshRepository();
  return all.length;
}
