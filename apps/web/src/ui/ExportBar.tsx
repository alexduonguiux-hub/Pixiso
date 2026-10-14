import { vi } from '../i18n/vi.js';

export function ExportBar() {
  return (
    <section className="panel">
      <h2>{vi.panels.export}</h2>
      <div className="row">
        <button type="button" disabled title={vi.export.comingSoon}>
          {vi.export.zip}
        </button>
        <button type="button" disabled title={vi.export.comingSoon}>
          {vi.export.pngJson}
        </button>
        <button type="button" disabled title={vi.export.comingSoon}>
          {vi.export.gif}
        </button>
      </div>
    </section>
  );
}
