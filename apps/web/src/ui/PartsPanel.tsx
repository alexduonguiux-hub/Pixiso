import { PART_NONE, partsForSlot, slotsForCharacter } from '@pixiso/shared';
import { vi } from '../i18n/vi.js';
import { useAppStore } from '../state/store.js';

export function PartsPanel() {
  const catalog = useAppStore((s) => s.catalog);
  const baseCharacter = useAppStore((s) => s.config.baseCharacter);
  const parts = useAppStore((s) => s.config.parts);
  const setPart = useAppStore((s) => s.setPart);
  return (
    <section className="panel">
      <h2>{vi.panels.parts}</h2>
      {slotsForCharacter(catalog, baseCharacter).map((slot) => {
        const options = partsForSlot(catalog, slot.id, baseCharacter);
        return (
          <div className="row" key={slot.id}>
            <label htmlFor={`part-${slot.id}`}>{slot.label_vi}</label>
            <select
              id={`part-${slot.id}`}
              data-testid={`part-${slot.id}`}
              value={parts[slot.id] ?? PART_NONE}
              onChange={(e) => setPart(slot.id, e.target.value)}
              style={{ flex: 1 }}
            >
              <option value={PART_NONE}>{vi.parts.none}</option>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label_vi}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </section>
  );
}
