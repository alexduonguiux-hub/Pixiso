/**
 * ZIP of exported files via fflate. Every entry gets one fixed timestamp, so
 * the archive's bytes depend only on its contents; PNG and GIF entries are
 * stored (already compressed), the rest deflated.
 */
import { unzipSync, zipSync, type Zippable } from 'fflate';

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Fixed entry time (local 2026-01-01 00:00: DOS times carry no zone, so the same fields in every zone). */
export const ZIP_MTIME = new Date(2026, 0, 1, 0, 0, 0);

export function zipFiles(entries: readonly ZipEntry[]): Uint8Array {
  const files: Zippable = {};
  for (const e of entries) {
    const stored = /\.(png|gif|zip)$/i.test(e.name);
    files[e.name] = [e.data, { level: stored ? 0 : 6, mtime: ZIP_MTIME }];
  }
  return zipSync(files);
}

export function unzipFiles(zip: Uint8Array): ZipEntry[] {
  return Object.entries(unzipSync(zip)).map(([name, data]) => ({ name, data }));
}
