import type { WorkFilter } from "./queries";

export interface SavedView {
  id: string;
  name: string;
  filter: WorkFilter;
  createdAt: string;
}

const STORAGE_KEY = "publishing-saved-views";

/**
 * Capa de acceso a vistas guardadas. Se puede reemplazar por una implementación
 * remota (API) sin tocar los componentes que la consumen.
 */
export class SavedViewsStore {
  constructor(private key: string = STORAGE_KEY) {}

  private readRaw(): string | null {
    if (typeof localStorage === "undefined") return null;
    try {
      return localStorage.getItem(this.key);
    } catch {
      return null;
    }
  }

  private writeRaw(value: string): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(this.key, value);
    } catch {
      // cuota excedida o modo privado: ignorar silenciosamente
    }
  }

  list(): SavedView[] {
    const raw = this.readRaw();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  get(id: string): SavedView | undefined {
    return this.list().find((v) => v.id === id);
  }

  save(view: Omit<SavedView, "id"> & { id?: string }): SavedView {
    const existing = this.list();
    const now = new Date().toISOString();
    const saved: SavedView = {
      id: view.id || crypto.randomUUID(),
      name: view.name,
      filter: view.filter,
      createdAt: view.createdAt || now,
    };
    const next = view.id
      ? existing.map((v) => (v.id === saved.id ? saved : v))
      : [...existing, saved];
    this.writeRaw(JSON.stringify(next));
    return saved;
  }

  delete(id: string): void {
    const next = this.list().filter((v) => v.id !== id);
    this.writeRaw(JSON.stringify(next));
  }
}

export const savedViewsStore = new SavedViewsStore();
