import { vi } from '../i18n/vi.js';

export function PixelPreviewPanel() {
  return (
    <section className="panel">
      <h2>{vi.panels.pixelPreview}</h2>
      <p className="muted small">{vi.pixelPreview.comingSoon}</p>
    </section>
  );
}
