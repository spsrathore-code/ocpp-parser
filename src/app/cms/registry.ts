// CMS format-adapter registry — the scalability seam.
//
// To support a new customer's Excel layout: implement a CmsFormatAdapter (see
// adapters/cz.ts), then add it to CMS_ADAPTERS. detectAdapter picks the first
// adapter whose detect() recognizes the workbook. Nothing else changes.

import type { WorkBook } from 'xlsx';
import type { CmsFormatAdapter } from './types';
import { czAdapter } from './adapters/cz';
import { mahindraAdapter } from './adapters/mahindra';

/** All registered customer CMS-format adapters, tried in order. */
export const CMS_ADAPTERS: CmsFormatAdapter[] = [czAdapter, mahindraAdapter];

/** First adapter that recognizes `workbook`, or null if none match. */
export function detectAdapter(workbook: WorkBook): CmsFormatAdapter | null {
  for (const adapter of CMS_ADAPTERS) {
    try {
      if (adapter.detect(workbook)) return adapter;
    } catch { /* a mis-detecting adapter must not break the others */ }
  }
  return null;
}

/** Look up a registered adapter by id (for user-forced customer selection). */
export function getAdapter(id: string): CmsFormatAdapter | undefined {
  return CMS_ADAPTERS.find((a) => a.id === id);
}
