"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Grid,
  List,
  Loader2,
  Music,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PublishingWork, Party } from "@/lib/publishing/types";
import { IdentifierDialog } from "./IdentifierDialog";
import {
  getPrimaryBlocker,
  getIssueCounts,
  DEFAULT_NO_RESPONSE_DAYS,
  computeCompleteness,
  useNow,
  type BlockerType,
  type BlockerInfo,
} from "@/lib/publishing/queries";

type ViewMode = "list" | "grid";
type FilterTab =
  | "all"
  | "correction"
  | "splits"
  | "register"
  | "no-response"
  | "missing-isrc"
  | "missing-identifiers";

type WorkStatusKey =
  | "draft"
  | "splits_pending"
  | "splits_signed"
  | "ready_to_register"
  | "submitted"
  | "released"
  | "iswc_pending"
  | "verified"
  | "needs_correction";

const STATUS_CONFIG: Record<
  WorkStatusKey,
  { label: string; icon: typeof Music; color: string; bgColor: string }
> = {
  draft: {
    label: "Borrador",
    icon: Music,
    color: "text-secondary-foreground",
    bgColor: "bg-secondary",
  },
  splits_pending: {
    label: "Splits pendientes",
    icon: FileText,
    color: "text-primary",
    bgColor: "bg-cream",
  },
  splits_signed: {
    label: "Splits firmados",
    icon: CheckCircle,
    color: "text-ink",
    bgColor: "bg-lavender",
  },
  ready_to_register: {
    label: "Listo para registrar",
    icon: ExternalLink,
    color: "text-foreground",
    bgColor: "bg-blue",
  },
  submitted: {
    label: "Enviada",
    icon: Loader2,
    color: "text-primary-foreground",
    bgColor: "bg-primary",
  },
  released: {
    label: "Lanzada",
    icon: Music,
    color: "text-ink",
    bgColor: "bg-mint",
  },
  iswc_pending: {
    label: "ISWC pendiente",
    icon: AlertTriangle,
    color: "text-ink",
    bgColor: "bg-olive",
  },
  verified: {
    label: "Verificada",
    icon: CheckCircle,
    color: "text-ink",
    bgColor: "bg-mint",
  },
  needs_correction: {
    label: "Requiere corrección",
    icon: AlertCircle,
    color: "text-destructive-foreground",
    bgColor: "bg-destructive",
  },
};

const TAB_CONFIG: { key: FilterTab; label: string; countKey: keyof ReturnType<typeof getIssueCounts> }[] = [
  { key: "all", label: "Todas", countKey: "without-isrc" },
  { key: "correction", label: "Requieren corrección", countKey: "correction" },
  { key: "splits", label: "Splits", countKey: "unsigned" },
  { key: "register", label: "Por registrar", countKey: "registration-pending" },
  { key: "no-response", label: "Sin respuesta", countKey: "registration-pending" },
  { key: "missing-isrc", label: "Sin ISRC", countKey: "without-isrc" },
  { key: "missing-identifiers", label: "Sin identificadores", countKey: "without-iswc" },
];

interface WorkWithBlocker {
  work: PublishingWork;
  blocker: ReturnType<typeof getPrimaryBlocker> | null;
}

interface PendingQueueProps {
  works: PublishingWork[];
  parties: Record<string, Party>;
  counts: ReturnType<typeof getIssueCounts>;
  now: Date;
  onAction: (work: PublishingWork, action: string) => void;
  onOpenIdentifier: (work: PublishingWork, kind: "isrc" | "iswc") => void;
}

function WorkRow({
  work,
  parties,
  blocker,
  onAction,
  onOpenIdentifier,
}: {
  work: PublishingWork;
  parties: Record<string, Party>;
  blocker: ReturnType<typeof getPrimaryBlocker>;
  onAction: (work: PublishingWork, action: string) => void;
  onOpenIdentifier: (work: PublishingWork, kind: "isrc" | "iswc") => void;
}) {
  const statusKey = work.status as keyof typeof STATUS_CONFIG;
  const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const getArtistName = () => {
    const artistId = work.recordings[0]?.artistPartyId;
    if (!artistId) return "—";
    const party = parties[artistId];
    return party?.stageName || party?.legalName || "—";
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (blocker.actionDisabled) return;
    if (blocker.type === "missing-isrc") {
      onOpenIdentifier(work, "isrc");
    } else if (blocker.type === "missing-identifiers") {
      onOpenIdentifier(work, "iswc");
    } else {
      onAction(work, blocker.actionLabel);
    }
  };

  if (isMobile) {
    return (
      <div className="border-b last:border-0 hover:bg-accent/30 transition-colors" style={{ minHeight: "88px" }}>
        <div className="p-3 flex items-start gap-3">
          <div className={cn("flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium", statusConfig.bgColor, statusConfig.color)}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{work.title}</span>
              <Badge variant="outline" className={cn("text-xs whitespace-nowrap", statusConfig.bgColor.replace("bg-", "bg-"), statusConfig.color.replace("text-", "text-"))}>
                {statusConfig.label}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground truncate">{work.internalCode}</div>
            <div className="mt-1 h-1.5 bg-muted/50 rounded-full w-3/4">
              <div className="h-1.5 bg-primary rounded-full" style={{ width: `${computeCompleteness(work)}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{computeCompleteness(work)}% completo</div>
          </div>
        </div>
        <div className="px-3 pb-3 flex items-center justify-between border-t border-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">{blocker.waitingText}</span>
            {blocker.additionalBlockers.length > 0 && (
              <span className="text-primary" title={blocker.additionalBlockers.join(", ")}>
                +{blocker.additionalBlockers.length} más
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs whitespace-nowrap"
            onClick={handleActionClick}
            disabled={blocker.actionDisabled}
          >
            {blocker.actionLabel}
            {!blocker.actionDisabled && <ChevronDown className="ml-1 w-3 h-3" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <tr className="border-b last:border-0 hover:bg-accent/30 transition-colors" style={{ height: "48px" }}>
      <td className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn("flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium", statusConfig.bgColor, statusConfig.color)}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium truncate max-w-[280px]">{work.title}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[280px]">{work.internalCode}</div>
          </div>
        </div>
      </td>
      <td className="p-3">
        <Badge variant="outline" className={cn("text-xs whitespace-nowrap", statusConfig.bgColor.replace("bg-", "bg-"), statusConfig.color.replace("text-", "text-"))}>
          {statusConfig.label}
        </Badge>
      </td>
      <td className="p-3 w-40">
        <div className="h-1.5 bg-muted/50 rounded-full">
          <div className="h-1.5 bg-primary rounded-full" style={{ width: `${computeCompleteness(work)}%` }} />
        </div>
        <div className="text-[10px] text-muted-foreground text-right mt-0.5">{computeCompleteness(work)}%</div>
      </td>
      <td className="p-3">
        <Badge variant="outline" className={cn("text-xs whitespace-nowrap",
          blocker.priority === "high" && "bg-destructive/10 text-destructive border-destructive/20",
          blocker.priority === "medium" && "bg-amber/10 text-amber-700 border-amber/20",
          blocker.priority === "low" && "bg-green/10 text-green-700 border-green/20"
        )}>
          {blocker.priority === "high" && <AlertTriangle className="w-3 h-3 mr-1" />}
          {blocker.priority === "medium" && <Clock className="w-3 h-3 mr-1" />}
          {blocker.priority === "low" && <CheckCircle className="w-3 h-3 mr-1" />}
          {blocker.priority.charAt(0).toUpperCase() + blocker.priority.slice(1)}
        </Badge>
      </td>
      <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate" title={blocker.waitingText + (blocker.additionalBlockers.length ? " · " + blocker.additionalBlockers.join(", ") : "")}>
        {blocker.waitingText}
        {blocker.additionalBlockers.length > 0 && (
          <span className="text-primary ml-1" title={blocker.additionalBlockers.join(", ")}>+{blocker.additionalBlockers.length} más</span>
        )}
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground">
            {getArtistName().charAt(0).toUpperCase()}
          </div>
          <span className="text-sm truncate max-w-[120px]">{getArtistName()}</span>
        </div>
      </td>
      <td className="p-3 text-right">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs whitespace-nowrap"
          onClick={handleActionClick}
          disabled={blocker.actionDisabled}
        >
          {blocker.actionLabel}
          {!blocker.actionDisabled && <ChevronDown className="ml-1 w-3 h-3" />}
        </Button>
      </td>
    </tr>
  );
}

function WorkCard({
  work,
  parties,
  blocker,
  onAction,
  onOpenIdentifier,
}: {
  work: PublishingWork;
  parties: Record<string, Party>;
  blocker: ReturnType<typeof getPrimaryBlocker>;
  onAction: (work: PublishingWork, action: string) => void;
  onOpenIdentifier: (work: PublishingWork, kind: "isrc" | "iswc") => void;
}) {
  const statusKey = work.status as keyof typeof STATUS_CONFIG;
  const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const getArtistName = () => {
    const artistId = work.recordings[0]?.artistPartyId;
    if (!artistId) return "—";
    const party = parties[artistId];
    return party?.stageName || party?.legalName || "—";
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (blocker.actionDisabled) return;
    if (blocker.type === "missing-isrc") {
      onOpenIdentifier(work, "isrc");
    } else if (blocker.type === "missing-identifiers") {
      onOpenIdentifier(work, "iswc");
    } else {
      onAction(work, blocker.actionLabel);
    }
  };

  return (
    <div className="border rounded-xl bg-card p-3 hover:shadow-md transition-shadow" style={{ minWidth: "280px", maxWidth: "320px" }}>
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-base font-medium", statusConfig.bgColor, statusConfig.color)}>
          <StatusIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{work.title}</div>
          <div className="text-xs text-muted-foreground truncate">{work.internalCode}</div>
        </div>
      </div>
      <Badge variant="outline" className={cn("text-xs mb-2", statusConfig.bgColor.replace("bg-", "bg-"), statusConfig.color.replace("text-", "text-"))}>
        {statusConfig.label}
      </Badge>
      <div className="mb-2">
        <div className="h-1.5 bg-muted/50 rounded-full">
          <div className="h-1.5 bg-primary rounded-full" style={{ width: `${computeCompleteness(work)}%` }} />
        </div>
        <div className="text-[10px] text-muted-foreground text-right mt-0.5">{computeCompleteness(work)}% completo</div>
      </div>
      <div className="mb-3 text-xs text-muted-foreground" title={blocker.waitingText + (blocker.additionalBlockers.length ? " · " + blocker.additionalBlockers.join(", ") : "")}>
        {blocker.waitingText}
        {blocker.additionalBlockers.length > 0 && (
          <span className="text-primary ml-1" title={blocker.additionalBlockers.join(", ")}>+{blocker.additionalBlockers.length} más</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={cn("text-xs",
          blocker.priority === "high" && "bg-destructive/10 text-destructive border-destructive/20",
          blocker.priority === "medium" && "bg-amber/10 text-amber-700 border-amber/20",
          blocker.priority === "low" && "bg-green/10 text-green-700 border-green/20"
        )}>
          {blocker.priority.charAt(0).toUpperCase() + blocker.priority.slice(1)}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs whitespace-nowrap"
          onClick={handleActionClick}
          disabled={blocker.actionDisabled}
        >
          {blocker.actionLabel}
          {!blocker.actionDisabled && <ChevronDown className="ml-1 w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}

function PendingQueueContent({
  works,
  parties,
  counts,
  now,
  onAction,
  onOpenIdentifier,
}: PendingQueueProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "priority", dir: "desc" });
  const [openDialog, setOpenDialog] = useState<{ work: PublishingWork | null; kind: "isrc" | "iswc" } | null>(null);

  interface WorkWithBlocker {
    work: PublishingWork;
    blocker: ReturnType<typeof getPrimaryBlocker> | null;
  }

  const worksWithBlockers = useMemo<{ work: PublishingWork; blocker: ReturnType<typeof getPrimaryBlocker> | null }[]>(() => {
    return works.map((work) => ({
      work,
      blocker: getPrimaryBlocker(work, now, DEFAULT_NO_RESPONSE_DAYS),
    }));
  }, [works, now]);

  const filteredWorks = useMemo(() => {
    let result = worksWithBlockers.filter((w): w is { work: PublishingWork; blocker: ReturnType<typeof getPrimaryBlocker> } => w.blocker !== null);

    if (activeTab !== "all") {
      result = result.filter(({ blocker }) => {
        switch (activeTab) {
          case "correction":
            return blocker.type === "needs-correction";
          case "splits":
            return blocker.type === "unsigned-split";
          case "register":
            return blocker.type === "ready-to-register";
          case "no-response":
            return blocker.type === "no-response";
          case "missing-isrc":
            return blocker.type === "missing-isrc";
          case "missing-identifiers":
            return blocker.type === "missing-identifiers";
          default:
            return true;
        }
      });
    }

    result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const dir = sortConfig.dir === "asc" ? 1 : -1;

      if (sortConfig.key === "priority") {
        return (priorityOrder[a.blocker.priority] - priorityOrder[b.blocker.priority]) * dir;
      }
      if (sortConfig.key === "daysSince") {
        return (a.blocker.daysSince - b.blocker.daysSince) * dir;
      }
      if (sortConfig.key === "title") {
        return a.work.title.localeCompare(b.work.title) * dir;
      }
      if (sortConfig.key === "status") {
        return a.work.status.localeCompare(b.work.status) * dir;
      }
      return (priorityOrder[a.blocker.priority] - priorityOrder[b.blocker.priority]) * dir;
    });

    return result;
  }, [worksWithBlockers, activeTab, sortConfig]);

  const isEmpty = filteredWorks.length === 0;

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc",
    }));
  };

  const getTabCount = (tab: FilterTab) => {
    if (tab === "all") return works.length;
    const tabConfig = TAB_CONFIG.find((t) => t.key === tab);
    if (!tabConfig) return 0;
    return counts[tabConfig.countKey] || 0;
  };

  if (now === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center text-muted-foreground">Cargando…</div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
        <p className="text-sm text-muted-foreground">Todo al día. No hay obras pendientes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI contadores superiores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { key: "without-isrc", label: "Obras sin ISRC", value: counts["without-isrc"] },
          { key: "without-iswc", label: "Obras sin ISWC", value: counts["without-iswc"] },
          { key: "without-mlc", label: "Sin MLC Song Code", value: counts["without-mlc"] },
          { key: "unsigned", label: "Splits sin firmar", value: counts.unsigned },
          {
            key: "registration-pending",
            label: "Registros pendientes",
            value: counts["registration-pending"],
          },
          { key: "correction", label: "Requieren corrección", value: counts.correction },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => onAction({} as PublishingWork, item.key)}
            className="p-0"
            aria-label={item.label}
          >
            <div className="kpi-tile">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="display-num text-3xl">{item.value}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 bg-muted/30 rounded-lg p-1" role="tablist">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              <span className="ml-1.5 px-1.5 text-[10px] font-mono bg-muted/50 rounded-full">
                {getTabCount(tab.key)}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="px-2 py-1.5 text-xs border rounded-md bg-background"
            aria-label="Vista"
          >
            <option value="list">Lista</option>
            <option value="grid">Cuadrícula</option>
          </select>
        </div>
      </div>

      {/* Table / Grid */}
      {viewMode === "list" ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left cursor-pointer hover:bg-muted/30" onClick={() => handleSort("title")}>
                  Obra {sortConfig.key === "title" && (sortConfig.dir === "asc" ? <ChevronUp className="inline w-3 h-3 ml-1" /> : <ChevronDown className="inline w-3 h-3 ml-1" />)}
                </th>
                <th className="p-3 text-left cursor-pointer hover:bg-muted/30" onClick={() => handleSort("status")}>
                  Estado {sortConfig.key === "status" && (sortConfig.dir === "asc" ? <ChevronUp className="inline w-3 h-3 ml-1" /> : <ChevronDown className="inline w-3 h-3 ml-1" />)}
                </th>
                <th className="p-3 text-left w-40">Progreso</th>
                <th className="p-3 text-left cursor-pointer hover:bg-muted/30" onClick={() => handleSort("priority")}>
                  Prioridad {sortConfig.key === "priority" && (sortConfig.dir === "asc" ? <ChevronUp className="inline w-3 h-3 ml-1" /> : <ChevronDown className="inline w-3 h-3 ml-1" />)}
                </th>
                <th className="p-3 text-left">Esperando</th>
                <th className="p-3 text-left">Artista</th>
                <th className="p-3 text-right">Siguiente paso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredWorks.map(({ work, blocker }) => (
                <WorkRow
                  key={work.id}
                  work={work}
                  parties={parties}
                  blocker={blocker!}
                  onAction={onAction}
                  onOpenIdentifier={onOpenIdentifier}
                />
              ))}
            </tbody>
          </table>
          <div className="p-3 flex items-center justify-between text-xs text-muted-foreground border-t">
            <span>Mostrando {filteredWorks.length} de {works.length} obras</span>
            {filteredWorks.length > 25 && (
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled>Anterior</Button>
                <Button variant="outline" size="sm">Siguiente</Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 p-1">
          {filteredWorks.map(({ work, blocker }) => (
            <WorkCard
              key={work.id}
              work={work}
              parties={parties}
              blocker={blocker!}
              onAction={onAction}
              onOpenIdentifier={onOpenIdentifier}
            />
          ))}
        </div>
      )}

      {openDialog && (
        <IdentifierDialog
          work={openDialog.work!}
          kind={openDialog.kind}
          onSave={(value) => {
            onAction(openDialog.work!, openDialog.kind === "isrc" ? "Agregar ISRC" : "Registrar identificador");
            setOpenDialog(null);
          }}
          open={true}
          onOpenChange={() => setOpenDialog(null)}
        />
      )}
    </div>
  );
}

export function PendingQueue({
  works,
  parties,
  counts,
  onAction,
  onOpenIdentifier,
}: PendingQueueProps) {
  const now = useNow();

  if (now === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center text-muted-foreground">Cargando…</div>
      </div>
    );
  }

  return <PendingQueueContent works={works} parties={parties} counts={counts} now={now} onAction={onAction} onOpenIdentifier={onOpenIdentifier} />;
}