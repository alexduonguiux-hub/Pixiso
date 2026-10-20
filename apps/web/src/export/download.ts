import type { ExportFile } from '@pixiso/sprite-kit';

/** Hands one exported file to the browser as a download. */
export function downloadFile(file: ExportFile): void {
  const blob = new Blob([file.data.slice()], { type: file.type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
