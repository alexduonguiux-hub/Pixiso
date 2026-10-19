import {
  DEFAULT_PROJECT_STYLE,
  DIRECTIONS_8,
  PART_NONE,
  characterConfigSchema,
  defaultCharacterConfig,
  normalizeConfig,
  projectStyleSchema,
  type Catalog,
  type CharacterConfig,
  type ColorName,
  type Direction,
  type HexColor,
  type ProjectStyle,
} from '@pixiso/shared';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { catalog as defaultCatalog } from '@pixiso/shared/catalog';

export interface PreviewState {
  /** Animation currently played in the preview; always one of `config.animations`. */
  animationId: string;
  direction: Direction;
  playing: boolean;
}

export interface PersistedState {
  config: CharacterConfig;
  style: ProjectStyle;
}

export interface AppState {
  catalog: Catalog;
  config: CharacterConfig;
  style: ProjectStyle;
  preview: PreviewState;
  setBaseCharacter: (id: string) => void;
  setPart: (slotId: string, partId: string) => void;
  /** A catalog colour name, "original" to clear, or an exact `#rrggbb` (D-096). */
  setColor: (target: string, color: ColorName | HexColor) => void;
  toggleAnimation: (animationId: string) => void;
  /** Replaces the whole config (e.g. from JSON or Claude); returns what normalization dropped. */
  replaceConfig: (config: CharacterConfig) => string[];
  resetConfig: () => void;
  setStyle: (patch: Partial<ProjectStyle>) => void;
  setPreview: (patch: Partial<PreviewState>) => void;
  /** Parses JSON text; returns dropped items on success or an error message. */
  importConfigJson: (
    text: string,
  ) => { ok: true; dropped: string[] } | { ok: false; error: string };
  exportConfigJson: () => string;
}

const STORAGE_KEY = 'pixiso:v1';

function pickPreviewAnimation(config: CharacterConfig, current: string): string {
  return config.animations.includes(current) ? current : (config.animations[0] ?? current);
}

export function createAppStore(
  catalog: Catalog,
  persisted?: Partial<PersistedState>,
): StoreApi<AppState> {
  const initialConfig = persisted?.config
    ? normalizeConfig(persisted.config, catalog).config
    : defaultCharacterConfig(catalog);
  const initialStyle = persisted?.style ?? DEFAULT_PROJECT_STYLE;

  return createStore<AppState>((set, get) => {
    const update = (config: CharacterConfig): string[] => {
      const { config: next, dropped } = normalizeConfig(config, catalog);
      set((s) => ({
        config: next,
        preview: { ...s.preview, animationId: pickPreviewAnimation(next, s.preview.animationId) },
      }));
      return dropped;
    };

    return {
      catalog,
      config: initialConfig,
      style: initialStyle,
      preview: {
        animationId: pickPreviewAnimation(initialConfig, 'walk'),
        direction: DIRECTIONS_8[0],
        playing: true,
      },

      setBaseCharacter: (id) => {
        update({ ...get().config, baseCharacter: id });
      },
      setPart: (slotId, partId) => {
        const cfg = get().config;
        update({ ...cfg, parts: { ...cfg.parts, [slotId]: partId || PART_NONE } });
      },
      setColor: (target, color) => {
        const cfg = get().config;
        const colors = cfg.colors.filter((c) => c.target !== target);
        if (color !== 'original') colors.push({ target, color });
        update({ ...cfg, colors });
      },
      toggleAnimation: (animationId) => {
        const cfg = get().config;
        const has = cfg.animations.includes(animationId);
        const animations = has
          ? cfg.animations.filter((a) => a !== animationId)
          : [...cfg.animations, animationId];
        if (animations.length === 0) return; // keep at least one
        update({ ...cfg, animations });
      },
      replaceConfig: (config) => update(config),
      resetConfig: () => {
        update(defaultCharacterConfig(catalog));
      },
      setStyle: (patch) => {
        set((s) => ({ style: projectStyleSchema.parse({ ...s.style, ...patch }) }));
      },
      setPreview: (patch) => {
        set((s) => ({ preview: { ...s.preview, ...patch } }));
      },
      importConfigJson: (text) => {
        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          return { ok: false, error: 'invalid_json' };
        }
        const parsed = characterConfigSchema.safeParse(raw);
        if (!parsed.success) return { ok: false, error: 'invalid_schema' };
        return { ok: true, dropped: update(parsed.data) };
      },
      exportConfigJson: () => JSON.stringify(get().config, null, 2),
    };
  });
}

export function loadPersisted(): Partial<PersistedState> | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const obj = JSON.parse(raw) as Partial<PersistedState>;
    const out: Partial<PersistedState> = {};
    const cfg = characterConfigSchema.safeParse(obj.config);
    if (cfg.success) out.config = cfg.data;
    const style = projectStyleSchema.safeParse(obj.style);
    if (style.success) out.style = style.data;
    return out;
  } catch {
    return undefined;
  }
}

export function persistOnChange(store: StoreApi<AppState>): () => void {
  return store.subscribe((s, prev) => {
    if (s.config === prev.config && s.style === prev.style) return;
    try {
      globalThis.localStorage?.setItem(
        STORAGE_KEY,
        JSON.stringify({ config: s.config, style: s.style }),
      );
    } catch {
      /* storage unavailable (private mode, quota): ignore */
    }
  });
}

export const appStore = createAppStore(defaultCatalog, loadPersisted());
persistOnChange(appStore);

export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useStore(appStore, selector);
}
