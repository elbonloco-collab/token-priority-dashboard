import { useState } from "react";
import { X, Bookmark, BookmarkMinus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { WorkFilter } from "@/lib/publishing/queries";
import { savedViewsStore } from "@/lib/publishing/saved-views";

type FilterChip =
  | { kind: "status"; value: string }
  | { kind: "bmi"; value: string }
  | { kind: "mlc"; value: string }
  | {
      kind: "flag";
      value: "missingIsrc" | "missingIswc" | "missingMlcSongCode" | "hasContract" | "hasSample";
    }
  | { kind: "split"; value: "unsigned" | "signed" }
  | { kind: "search"; value: string };

export interface FilterBarProps {
  filter: WorkFilter;
  onChange: (chip: FilterChip, checked: boolean) => void;
  onClear: () => void;
  activeChips: FilterChip[];
  searchPlaceholder?: string;
  onSaveView?: (name: string, filter: WorkFilter) => void;
  onLoadView?: (filter: WorkFilter) => void;
}

const LABELS: Record<string, string> = {
  draft: "Borrador",
  splits_pending: "Splits pendientes",
  splits_signed: "Splits firmados",
  ready_to_register: "Listo para registrar",
  submitted: "Enviado",
  iswc_pending: "ISWC pendiente",
  released: "Publicada",
  verified: "Verificada",
  needs_correction: "Requiere corrección",
  none: "Sin registro",
  registered: "Registrado",
  missingIsrc: "Falta ISRC",
  missingIswc: "Falta ISWC",
  missingMlcSongCode: "Falta Song Code",
  unsigned: "Split sin firmar",
  signed: "Split firmado",
  hasContract: "Tiene contrato",
  hasSample: "Con sample",
};

export function FilterBar({
  filter,
  onChange,
  onClear,
  activeChips,
  searchPlaceholder = "Buscar título, compositor, ISRC, ISWC...",
  onSaveView,
  onLoadView,
}: FilterBarProps) {
  const [query, setQuery] = useState(filter.search || "");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [viewName, setViewName] = useState("");
  const savedViews = savedViewsStore.list();

  const hasAny = activeChips.length > 0 || Boolean(query);

  const toggleChip = (chip: FilterChip) => {
    const active = activeChips.some((c) => c.kind === chip.kind && c.value === chip.value);
    onChange(chip, !active);
  };

  const handleSaveView = () => {
    if (viewName.trim() && onSaveView) {
      onSaveView(viewName.trim(), filter);
      setViewName("");
      setShowSaveDialog(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {activeChips.map((chip) => (
          <Button
            key={`${chip.kind}-${chip.value}`}
            variant="outline"
            size="sm"
            onClick={() => toggleChip(chip)}
            className="flex items-center gap-1.5 whitespace-nowrap"
          >
            {LABELS[chip.value] ?? chip.value}
            <X
              className="h-3 w-3 ml-0.5"
              onClick={(e) => {
                e.stopPropagation();
                toggleChip(chip);
              }}
            />
          </Button>
        ))}
        {hasAny && (
          <Button variant="outline" size="sm" onClick={onClear}>
            Limpiar filtros
          </Button>
        )}
        <Select
          value="views"
          onValueChange={(value) => {
            if (value === "__save__") {
              setShowSaveDialog(true);
            } else if (value !== "views" && onLoadView) {
              const view = savedViews.find((v) => v.id === value);
              if (view) onLoadView(view.filter);
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Vistas guardadas" />
          </SelectTrigger>
          <SelectContent>
            {savedViews.map((view) => (
              <SelectItem key={view.id} value={view.id}>
                {view.name}
              </SelectItem>
            ))}
            <SelectItem value="__save__" className="flex items-center gap-2 text-primary">
              <Bookmark className="h-3.5 w-3.5" />
              Guardar vista actual…
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <Input
          className="pl-9 pr-8 h-8 text-sm"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange({ kind: "search", value: query }, true);
            }
          }}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search className="h-4 w-4" aria-hidden="true" />
        </div>
        {query && (
          <button
            onClick={() => {
              setQuery("");
              onChange({ kind: "search", value: "" }, false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground opacity-60"
            aria-label="Borrar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-3">
          <div className="w-full max-w-sm rounded-2xl border bg-popover p-4 shadow-2xl">
            <h3 className="font-semibold">Guardar vista</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Asigna un nombre a esta combinación de filtros.
            </p>
            <Input
              className="mt-3"
              placeholder="Nombre de la vista"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveView()}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveView} disabled={!viewName.trim()}>
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground uppercase tracking-wider">
        Chips combinables y editables. Los filtros viven en la URL.
      </div>
    </div>
  );
}
