"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Edit2,
  Save,
  X,
  MoreHorizontal,
  Trash2,
  Archive,
  AlertCircle,
  CheckCircle,
  Music,
  FileText,
  Users,
  Building2,
  HardDrive,
  Database,
  FileUp,
  History,
  Undo2,
  Loader2,
  ExternalLink,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { PublishingWork, Party, Recording, Registration, SplitAgreement, WorkWriter, WorkPublisher, WorkStatus } from "@/lib/publishing/types";
import { usePublishingStore, useWork, rehydrateStore, registerHydrationCallbacks } from "@/lib/publishing/store";
import { getPrimaryBlocker, computeCompleteness, validateIdentifier, DEFAULT_NO_RESPONSE_DAYS, makeId, useNow } from "@/lib/publishing/queries";
import { IdentifierDialog } from "./IdentifierDialog";
import { statusLabels, statusConfig } from "./status";

const SECTIONS = [
  { id: "summary", label: "Resumen", icon: FileText },
  { id: "details", label: "Datos de la obra", icon: Music },
  { id: "writers", label: "Compositores y splits", icon: Users },
  { id: "publisher", label: "Editorial", icon: Building2 },
  { id: "recordings", label: "Grabaciones", icon: HardDrive },
  { id: "registrations", label: "Registros", icon: Database },
  { id: "documents", label: "Documentos", icon: FileUp },
  { id: "history", label: "Historial", icon: History },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const STATUS_CONFIG: Record<WorkStatus, { label: string; icon: typeof Music; color: string; bgColor: string }> = statusConfig;

const PRIORITY_THRESHOLDS = { low: 14, medium: 30 };

function getPriority(days: number): "high" | "medium" | "low" {
  if (days > PRIORITY_THRESHOLDS.medium) return "high";
  if (days >= PRIORITY_THRESHOLDS.low) return "medium";
  return "low";
}

function formatIsrcForDisplay(isrc: string): string {
  const clean = isrc.replace(/-/g, "").toUpperCase();
  if (clean.length !== 12) return isrc;
  return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 7)}-${clean.slice(7)}`;
}

function WorkNotFound({ returnTo }: { returnTo: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Obra no encontrada</h2>
        <p className="text-muted-foreground mb-6">El ID proporcionado no corresponde a ninguna obra.</p>
        <Button onClick={() => navigate({ to: returnTo })} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la lista
        </Button>
      </div>
    </div>
  );
}

function StickyHeader({
  work,
  blocker,
  onBack,
  onAction,
  onOpenIdentifier,
  onArchive,
  onDelete,
}: {
  work: PublishingWork;
  blocker: ReturnType<typeof getPrimaryBlocker>;
  onBack: () => void;
  onAction: (work: PublishingWork, action: string) => void;
  onOpenIdentifier: (work: PublishingWork, kind: "isrc" | "iswc") => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const statusConfig = STATUS_CONFIG[work.status];
  const StatusIcon = statusConfig.icon;

  const handleActionClick = () => {
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
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              defaultValue={work.title}
              className="font-semibold text-xl bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary pr-2"
              readOnly
            />
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {statusConfig.label}
            </Badge>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Music className="h-3.5 w-3.5" />
              <span>{work.internalCode}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span>Completitud: {computeCompleteness(work)}%</span>
            <div className="w-32 h-1.5 bg-muted/50 rounded-full">
              <div className="h-1.5 bg-primary rounded-full" style={{ width: `${computeCompleteness(work)}%` }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <FileText className="mr-2 h-3.5 w-3.5" />
            Generar split sheet
          </Button>
          <Button variant="outline" size="sm" disabled>
            <FileUp className="mr-2 h-3.5 w-3.5" />
            Generar hoja
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Más opciones">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Opciones</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={onArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archivar
                </Button>
                <Button variant="destructive" className="w-full justify-start" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-2 border-t">
        <div className="flex items-center gap-3 text-sm">
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
            blocker.priority === "high" && "bg-destructive/10 text-destructive",
            blocker.priority === "medium" && "bg-amber/10 text-amber-700",
            blocker.priority === "low" && "bg-green/10 text-green-700"
          )}>
            {blocker.priority === "high" && <AlertCircle className="h-3 w-3" />}
            {blocker.priority === "medium" && <Loader2 className="h-3 w-3" />}
            {blocker.priority === "low" && <CheckCircle className="h-3 w-3" />}
            {blocker.label}
          </div>
          <span className="text-muted-foreground">Esperando: {blocker.waitingText}</span>
        </div>
        <Button size="sm" variant={blocker.actionDisabled ? "outline" : "default"} onClick={handleActionClick} disabled={blocker.actionDisabled}>
          {blocker.actionLabel}
          {!blocker.actionDisabled && <ChevronRight className="ml-1 h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function SectionNav({ activeSection, onSectionChange }: { activeSection: SectionId; onSectionChange: (s: SectionId) => void }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  if (isMobile) {
    return (
      <nav className="sticky top-16 z-30 flex gap-2 overflow-x-auto pb-2 px-4 border-b bg-background/95 backdrop-blur-sm" role="tablist" aria-label="Secciones">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={activeSection === s.id}
            onClick={() => onSectionChange(s.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap rounded-full transition-colors",
              activeSection === s.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <s.icon className="h-4 w-4" />
            {s.label}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <aside className="sticky top-16 z-30 h-[calc(100vh-8rem)] overflow-y-auto border-r pr-4" role="navigation" aria-label="Secciones de la hoja de obra">
      <nav className="flex flex-col gap-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => onSectionChange(s.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left w-full",
              activeSection === s.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <s.icon className="h-4 w-4 flex-shrink-0" />
            {s.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function SummarySection({ work, parties, now }: { work: PublishingWork; parties: Record<string, Party>; now: Date }) {
  const blocker = getPrimaryBlocker(work, now, DEFAULT_NO_RESPONSE_DAYS);
  const missing: string[] = [];

  if (!work.title?.trim()) missing.push("Título");
  if (work.writers.length === 0) missing.push("Compositores");
  if (!work.recordings.some((r) => r.isrc)) missing.push("ISRC en grabaciones");
  if (!work.iswc) missing.push("ISWC");
  if (!work.mlcSongCode) missing.push("MLC Song Code");
  if (!work.bmiWorkId) missing.push("BMI Work ID");
  if (work.recordings.length === 0) missing.push("Grabaciones");
  if (!work.recordings.some((r) => r.releaseDate)) missing.push("Fecha de lanzamiento");
  if (work.splitAgreement?.status !== "signed") missing.push("Split firmado");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Lista para registrar
        </h3>
        {missing.length === 0 ? (
          <p className="text-green-600">Todo completo. La obra puede registrarse en BMI y MLC.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">Faltan los siguientes campos:</p>
            <ul className="space-y-2">
              {missing.map((m) => (
                <li key={m} className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-medium mb-3">Datos básicos</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Título</dt><dd className="font-medium truncate max-w-[200px]">{work.title || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Títulos alternativos</dt><dd>{work.alternateTitles.join(", ") || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Idioma</dt><dd>{work.language || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Duración</dt><dd>{work.durationSeconds ? `${Math.floor(work.durationSeconds / 60)}:${String(work.durationSeconds % 60).padStart(2, "0")}` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Versión</dt><dd>{work.versionNote || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Contrato</dt><dd>{work.hasContract ? "Sí" : "No"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Sample / Interpolación</dt><dd>{work.sampleFlag ? `Sí (${work.controlledSharePercent}% controlado)` : "No"}</dd></div>
            {work.sampleFlag && <div className="sm:col-span-2"><dt className="text-muted-foreground">Notas de sample</dt><dd>{work.sampleNotes || "—"}</dd></div>}
          </dl>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-medium mb-3">Identificadores</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">ISWC</dt><dd className="font-mono text-xs">{work.iswc || "Pendiente"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">BMI Work ID</dt><dd className="font-mono text-xs">{work.bmiWorkId || "Pendiente"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">MLC Song Code</dt><dd className="font-mono text-xs">{work.mlcSongCode || "Pendiente"}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border bg-card p-4 sm:col-span-2">
          <h4 className="font-medium mb-3">Compositores</h4>
          {work.writers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin compositores asignados</p>
          ) : (
            <ul className="space-y-2">
              {work.writers.map((w) => {
                const party = parties[w.partyId];
                return (
                  <li key={w.partyId} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span>{party?.legalName || "Pendiente"}</span>
                    <span className="text-muted-foreground">{w.role} · {w.writerSharePercent}% {w.controlled ? "(controlado)" : ""}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 sm:col-span-2">
          <h4 className="font-medium mb-3">Editorial</h4>
          {work.publishers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin editorial asignada</p>
          ) : (
            <ul className="space-y-2">
              {work.publishers.map((p) => {
                const party = parties[p.partyId];
                return (
                  <li key={p.partyId} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span>{party?.legalName || "Pendiente"} {p.isOwn ? "· Propia" : ""}</span>
                    <span className="text-muted-foreground">{p.publisherSharePercent}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 sm:col-span-2">
          <h4 className="font-medium mb-3">Grabaciones</h4>
          {work.recordings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin grabaciones</p>
          ) : (
            <ul className="space-y-2">
              {work.recordings.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span>{r.title}</span>
                  <span className="text-muted-foreground font-mono text-xs">{r.isrc ? formatIsrcForDisplay(r.isrc) : "ISRC pendiente"} {r.releaseDate ? `· {r.releaseDate}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 sm:col-span-2">
          <h4 className="font-medium mb-3">Registros (BMI / MLC)</h4>
          {work.registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros iniciados</p>
          ) : (
            <ul className="space-y-2">
              {work.registrations.map((reg) => (
                <li key={reg.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span>{reg.society}</span>
                  <span className="text-muted-foreground">{reg.status} {reg.referenceId ? `· {reg.referenceId}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EditableField<T>({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  error,
  placeholder,
  className = "",
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  type?: "text" | "number" | "textarea" | "checkbox" | "date";
  disabled?: boolean;
  error?: string | undefined;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      {type === "textarea" ? (
        <Textarea
          value={String(value)}
          onChange={(e) => onChange(e.target.value as T)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(error && "border-destructive")}
        />
      ) : type === "checkbox" ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={Boolean(value)} onCheckedChange={(c) => onChange(c as T)} disabled={disabled} />
          <span className="text-sm">{label}</span>
        </label>
      ) : (
        <Input
          type={type}
          value={String(value)}
          onChange={(e) => onChange(e.target.value as T)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(error && "border-destructive")}
        />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function DetailsSection({ work, onSave, onCancel, isEditing, originalWork }: {
  work: PublishingWork;
  onSave: (work: PublishingWork) => void;
  onCancel: () => void;
  isEditing: boolean;
  originalWork: PublishingWork;
}) {
  const [draft, setDraft] = useState<{
    title: string;
    alternateTitles: string[];
    language: string;
    durationSeconds: string;
    versionNote: string;
    hasContract: boolean;
    sampleFlag: boolean;
    sampleNotes: string;
    controlledSharePercent: string;
  }>(() => ({
    title: work.title,
    alternateTitles: work.alternateTitles,
    language: work.language,
    durationSeconds: work.durationSeconds?.toString() || "",
    versionNote: work.versionNote || "",
    hasContract: work.hasContract,
    sampleFlag: work.sampleFlag,
    sampleNotes: work.sampleNotes || "",
    controlledSharePercent: work.controlledSharePercent?.toString() || "100",
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!draft["title"].trim()) newErrors.title = "El título es obligatorio";
    if (draft["durationSeconds"] && isNaN(Number(draft["durationSeconds"]))) newErrors.duration = "Duración inválida";
    if (draft["controlledSharePercent"] && (Number(draft["controlledSharePercent"]) < 0 || Number(draft["controlledSharePercent"]) > 100)) newErrors.controlled = "Debe estar entre 0 y 100";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const updated: PublishingWork = {
      ...work,
      title: draft["title"],
      alternateTitles: draft["alternateTitles"],
      language: draft["language"],
      durationSeconds: draft["durationSeconds"] ? Number(draft["durationSeconds"]) : null,
      versionNote: draft["versionNote"],
      hasContract: draft["hasContract"],
      sampleFlag: draft["sampleFlag"],
      sampleNotes: draft["sampleNotes"],
      controlledSharePercent: Number(draft["controlledSharePercent"]) || 0,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
  };

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-4">
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><dt className="text-muted-foreground">Título</dt><dd className="font-medium">{work.title}</dd></div>
            <div><dt className="text-muted-foreground">Títulos alternativos</dt><dd>{work.alternateTitles.join(", ") || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Idioma</dt><dd>{work.language}</dd></div>
            <div><dt className="text-muted-foreground">Duración</dt><dd>{work.durationSeconds ? `${Math.floor(work.durationSeconds / 60)}:${String(work.durationSeconds % 60).padStart(2, "0")}` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">Versión</dt><dd>{work.versionNote || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Contrato</dt><dd>{work.hasContract ? "Sí" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Sample / Interpolación</dt><dd>{work.sampleFlag ? `Sí (${work.controlledSharePercent}% controlado)` : "No"}</dd></div>
            {work.sampleFlag && <div className="sm:col-span-2"><dt className="text-muted-foreground">Notas de sample</dt><dd>{work.sampleNotes || "—"}</dd></div>}
          </dl>
        </div>
        <Button variant="outline" onClick={() => setDraft({ ...draft })}>Editar</Button>
      </div>
    );
  }

  function createDraftView(draft: {
    title: string;
    alternateTitles: string[];
    language: string;
    durationSeconds: string;
    versionNote: string;
    hasContract: boolean;
    sampleFlag: boolean;
    sampleNotes: string;
    controlledSharePercent: string;
  }): {
    title: string;
    alternateTitles: string[];
    language: string;
    durationSeconds: string;
    versionNote: string;
    hasContract: boolean;
    sampleFlag: boolean;
    sampleNotes: string;
    controlledSharePercent: string;
  } {
    return {
      title: draft["title"],
      alternateTitles: draft["alternateTitles"],
      language: draft["language"],
      durationSeconds: draft["durationSeconds"],
      versionNote: draft["versionNote"],
      hasContract: draft["hasContract"],
      sampleFlag: draft["sampleFlag"],
      sampleNotes: draft["sampleNotes"],
      controlledSharePercent: draft["controlledSharePercent"],
    };
  }

  const d = createDraftView(draft);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <EditableField label="Título" value={d["title"]} onChange={(v) => setDraft({ ...draft, title: v })} error={errors.title} />
        <EditableField label="Títulos alternativos (separados por comas)" value={d["alternateTitles"].join(", ")} onChange={(v) => setDraft({ ...draft, alternateTitles: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
        <EditableField label="Idioma" value={d["language"]} onChange={(v) => setDraft({ ...draft, language: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <EditableField type="number" label="Duración (segundos)" value={d["durationSeconds"]} onChange={(v) => setDraft({ ...draft, durationSeconds: v })} error={errors.duration} />
          <EditableField label="Versión" value={d["versionNote"]} onChange={(v) => setDraft({ ...draft, versionNote: v })} />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={d["hasContract"]} onCheckedChange={(c) => setDraft({ ...draft, hasContract: c })} />
            <span className="text-sm">Tiene contrato</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={d["sampleFlag"]} onCheckedChange={(c) => setDraft({ ...draft, sampleFlag: c })} />
            <span className="text-sm">Sample / Interpolación</span>
          </label>
        </div>
        {d["sampleFlag"] && (
          <div className="grid gap-4 sm:grid-cols-2">
            <EditableField type="textarea" label="Notas de sample" value={d["sampleNotes"]} onChange={(v) => setDraft({ ...draft, sampleNotes: v })} />
            <EditableField type="number" label="% Controlado" value={d["controlledSharePercent"]} onChange={(v) => setDraft({ ...draft, controlledSharePercent: v })} error={errors.controlled} />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave}>Guardar</Button>
      </div>
    </div>
  );
}

function WritersSection({ work, parties, onSave, onCancel, isEditing, originalWork }: {
  work: PublishingWork;
  parties: Record<string, Party>;
  onSave: (work: PublishingWork) => void;
  onCancel: () => void;
  isEditing: boolean;
  originalWork: PublishingWork;
}) {
  const [writers, setWriters] = useState<WorkWriter[]>(() => work.writers.map((w) => ({ ...w })));
  const [errors, setErrors] = useState<string | null>(null);

  const total = writers.reduce((sum, w) => sum + w.writerSharePercent, 0);
  const isValid = Math.abs(total - 100) <= 0.06;

  const validate = () => {
    if (!isValid) {
      setErrors(`Los porcentajes deben sumar 100% (actual: ${total.toFixed(2)}%). Tolerancia: ±0.06%`);
      return false;
    }
    setErrors(null);
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    const updated: PublishingWork = { ...work, writers, updatedAt: new Date().toISOString() };
    onSave(updated);
  };

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          {work.writers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin compositores</p>
          ) : (
            <ul className="space-y-2">
              {work.writers.map((w) => {
                const party = parties[w.partyId];
                return (
                  <li key={w.partyId} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <span>{party?.legalName || "Pendiente"}</span>
                    <span className="text-muted-foreground">{w.role} · {w.writerSharePercent}% {w.controlled ? "(controlado)" : ""}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 flex items-center justify-between text-sm">
            <span>Total compositores:</span>
            <span className={cn("font-medium", isValid ? "text-green-600" : "text-destructive")}>
              {total.toFixed(2)}%
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={() => setWriters(work.writers.map((w) => ({ ...w })))}>Editar</Button>
      </div>
    );
  }

  const addWriter = () => {
    setWriters([...writers, { partyId: makeId(), role: "composer_lyricist", writerSharePercent: 0, controlled: true }]);
  };

  const removeWriter = (idx: number) => {
    setWriters(writers.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-3">
        {writers.map((w, idx) => (
          <div key={w.partyId} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Input
              placeholder="Nombre del compositor"
              value={parties[w.partyId]?.legalName || ""}
              onChange={(e) => {
                const updated = [...writers];
                updated[idx] = { partyId: w.partyId, role: w.role, writerSharePercent: w.writerSharePercent, controlled: w.controlled };
                setWriters(updated);
              }}
              className="flex-1"
            />
            <Select value={w.role} onValueChange={(v) => { const updated = [...writers]; updated[idx] = { partyId: w.partyId, role: v as WorkWriter["role"], writerSharePercent: w.writerSharePercent, controlled: w.controlled }; setWriters(updated); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="composer">Compositor</SelectItem>
                <SelectItem value="lyricist">Letrista</SelectItem>
                <SelectItem value="composer_lyricist">Compositor/Letrista</SelectItem>
                <SelectItem value="arranger">Arreglista</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={w.writerSharePercent}
              onChange={(e) => { const updated = [...writers]; updated[idx] = { partyId: w.partyId, role: w.role, writerSharePercent: Number(e.target.value) || 0, controlled: w.controlled }; setWriters(updated); }}
              className="w-20"
            />
            <label className="flex items-center gap-1.5 text-xs">
              <Switch checked={w.controlled} onCheckedChange={(c) => { const updated = [...writers]; updated[idx] = { partyId: w.partyId, role: w.role, writerSharePercent: w.writerSharePercent, controlled: c }; setWriters(updated); }} />
              Controlado
            </label>
            <Button variant="ghost" size="icon" onClick={() => removeWriter(idx)} className="text-destructive">
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addWriter} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Agregar compositor
        </Button>
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span>Total:</span>
          <span className={cn("font-medium", isValid ? "text-green-600" : "text-destructive")}>
            {total.toFixed(2)}% {errors && `· ${errors}`}
          </span>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} disabled={!isValid}>Guardar</Button>
      </div>
    </div>
  );
}

function PublisherSection({ work, parties, onSave, onCancel, isEditing, originalWork }: {
  work: PublishingWork;
  parties: Record<string, Party>;
  onSave: (work: PublishingWork) => void;
  onCancel: () => void;
  isEditing: boolean;
  originalWork: PublishingWork;
}) {
  const [publishers, setPublishers] = useState<WorkPublisher[]>(() => work.publishers.map((p) => ({ ...p })));
  const [mode, setMode] = useState<"own" | "other" | "self">(() => {
    if (work.publishers.length === 0) return "self";
    if (work.publishers.some((p) => p.isOwn)) return "own";
    return "other";
  });
  const [errors, setErrors] = useState<string | null>(null);

  const total = publishers.reduce((sum, p) => sum + p.publisherSharePercent, 0);
  const expected = mode === "self" ? 200 : 100;
  const isValid = Math.abs(total - expected) <= 0.06;

  const validate = () => {
    if (!isValid) {
      setErrors(`Debe sumar ${expected}% (actual: ${total.toFixed(2)}%). Tolerancia: ±0.06%`);
      return false;
    }
    setErrors(null);
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    const updated: PublishingWork = { ...work, publishers, updatedAt: new Date().toISOString() };
    onSave(updated);
  };

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          {work.publishers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin editorial</p>
          ) : (
            <ul className="space-y-2">
              {work.publishers.map((p) => {
                const party = parties[p.partyId];
                return (
                  <li key={p.partyId} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <span>{party?.legalName || "Pendiente"} {p.isOwn ? "· Propia" : ""}</span>
                    <span className="text-muted-foreground">{p.publisherSharePercent}%</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 flex items-center justify-between text-sm">
            <span>Total editorial:</span>
            <span className={cn("font-medium", isValid ? "text-green-600" : "text-destructive")}>
              {total.toFixed(2)}%
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={() => setPublishers(work.publishers.map((p) => ({ ...p })))}>Editar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Modo</Label>
          <Select value={mode} onValueChange={(v: "own" | "other" | "self") => setMode(v)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="own">Mi editorial</SelectItem>
              <SelectItem value="other">Otra editorial</SelectItem>
              <SelectItem value="self">Sin editorial (autopublicado)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {publishers.map((p, idx) => (
          <div key={p.partyId} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Input placeholder="Nombre editorial" value={parties[p.partyId]?.legalName || ""} className="flex-1" />
            <Input
              type="number"
              step="0.01"
              min="0"
              max="200"
              value={p.publisherSharePercent}
              onChange={(e) => { const updated = [...publishers]; updated[idx] = { partyId: p.partyId, publisherSharePercent: Number(e.target.value) || 0, isOwn: p.isOwn, administratorPartyId: p.administratorPartyId, agreementNumber: p.agreementNumber }; setPublishers(updated); }}
              className="w-24"
            />
            <label className="flex items-center gap-1.5 text-xs">
              <Switch checked={p.isOwn} onCheckedChange={(c) => { const updated = [...publishers]; updated[idx] = { partyId: p.partyId, publisherSharePercent: p.publisherSharePercent, isOwn: c, administratorPartyId: p.administratorPartyId, agreementNumber: p.agreementNumber }; setPublishers(updated); }} />
              Propia
            </label>
            <Input placeholder="Nº acuerdo" value={p.agreementNumber || ""} onChange={(e) => { const updated = [...publishers]; updated[idx] = { partyId: p.partyId, publisherSharePercent: p.publisherSharePercent, isOwn: p.isOwn, administratorPartyId: p.administratorPartyId, agreementNumber: e.target.value }; setPublishers(updated); }} className="w-40" />
            <Button variant="ghost" size="icon" onClick={() => setPublishers(publishers.filter((_, i) => i !== idx))} className="text-destructive">
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setPublishers([...publishers, { partyId: makeId(), publisherSharePercent: 0, isOwn: false, administratorPartyId: null, agreementNumber: null }])} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Agregar editorial
        </Button>
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span>Total ({mode === "self" ? "200%" : "100%"} esperado):</span>
          <span className={cn("font-medium", isValid ? "text-green-600" : "text-destructive")}>
            {total.toFixed(2)}% {errors && `· ${errors}`}
          </span>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} disabled={!isValid}>Guardar</Button>
      </div>
    </div>
  );
}

function RecordingsSection({ work, onSave, onCancel, isEditing, originalWork, onOpenIdentifier }: {
  work: PublishingWork;
  onSave: (work: PublishingWork) => void;
  onCancel: () => void;
  isEditing: boolean;
  originalWork: PublishingWork;
  onOpenIdentifier: (work: PublishingWork, kind: "isrc" | "iswc") => void;
}) {
  const [recordings, setRecordings] = useState<Recording[]>(() => work.recordings.map((r) => ({ ...r })));
  const [openIsrcDialog, setOpenIsrcDialog] = useState<Recording | null>(null);

  const handleSave = () => {
    const updated: PublishingWork = { ...work, recordings, updatedAt: new Date().toISOString() };
    onSave(updated);
  };

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          {work.recordings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin grabaciones</p>
          ) : (
            <ul className="space-y-2">
              {work.recordings.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span>{r.title}</span>
                  <span className="text-muted-foreground font-mono text-xs">{r.isrc ? formatIsrcForDisplay(r.isrc) : "ISRC pendiente"} {r.releaseDate ? `· {r.releaseDate}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button variant="outline" onClick={() => setRecordings(work.recordings.map((r) => ({ ...r })))}>Editar</Button>
      </div>
    );
  }

  const addRecording = () => {
    setRecordings([...recordings, { id: makeId(), workId: work.id, releaseId: null, title: work.title, versionTitle: "", artistPartyId: null, isrc: null, durationSeconds: work.durationSeconds, releaseDate: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null }]);
  };

  const removeRecording = (id: string) => {
    setRecordings(recordings.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-3">
        {recordings.map((r) => (
          <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Input placeholder="Título" value={r.title} onChange={(e) => setRecordings(recordings.map((rec) => rec.id === r.id ? { ...rec, title: e.target.value } : rec))} className="flex-1" />
            <Input placeholder="ISRC" value={r.isrc ? formatIsrcForDisplay(r.isrc) : ""} onChange={(e) => setRecordings(recordings.map((rec) => rec.id === r.id ? { ...rec, isrc: e.target.value.replace(/-/g, "").toUpperCase() } : rec))} className="w-40 font-mono text-xs" />
            <Input type="date" value={r.releaseDate || ""} onChange={(e) => setRecordings(recordings.map((rec) => rec.id === r.id ? { ...rec, releaseDate: e.target.value || null } : rec))} className="w-36" />
            {!r.isrc && (
              <Button variant="outline" size="sm" onClick={() => setOpenIsrcDialog(r)}>
                Agregar ISRC
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => removeRecording(r.id)} className="text-destructive">
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addRecording} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Agregar grabación
        </Button>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave}>Guardar</Button>
      </div>

      {openIsrcDialog && (
        <IdentifierDialog
          work={work}
          kind="isrc"
          onSave={(value) => {
            setRecordings(recordings.map((r) => r.id === openIsrcDialog.id ? { ...r, isrc: value, updatedAt: new Date().toISOString() } : r));
            setOpenIsrcDialog(null);
          }}
          open={true}
          onOpenChange={() => setOpenIsrcDialog(null)}
        />
      )}
    </div>
  );
}

function RegistrationsSection({ work, onSave, onCancel, isEditing, originalWork }: {
  work: PublishingWork;
  onSave: (work: PublishingWork) => void;
  onCancel: () => void;
  isEditing: boolean;
  originalWork: PublishingWork;
}) {
  const [registrations, setRegistrations] = useState<Registration[]>(() => work.registrations.map((r) => ({ ...r })));
  const [identifiers, setIdentifiers] = useState<{ iswc: string; bmiWorkId: string; mlcSongCode: string }>({ iswc: work.iswc || "", bmiWorkId: work.bmiWorkId || "", mlcSongCode: work.mlcSongCode || "" });
  const [errors, setErrors] = useState<{ iswc?: string }>({});

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (identifiers["iswc"]) {
      const { valid } = validateIdentifier("iswc", identifiers["iswc"]);
      if (!valid) newErrors.iswc = "ISWC inválido";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    const updated: PublishingWork = {
      ...work,
      iswc: identifiers["iswc"] || null,
      bmiWorkId: identifiers["bmiWorkId"] || null,
      mlcSongCode: identifiers["mlcSongCode"] || null,
      registrations,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
  };

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label className="text-sm text-muted-foreground">ISWC</Label><p className="font-mono text-sm">{work.iswc || "Pendiente"}</p></div>
            <div><Label className="text-sm text-muted-foreground">BMI Work ID</Label><p className="font-mono text-sm">{work.bmiWorkId || "Pendiente"}</p></div>
            <div><Label className="text-sm text-muted-foreground">MLC Song Code</Label><p className="font-mono text-sm">{work.mlcSongCode || "Pendiente"}</p></div>
          </div>
          {work.registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros iniciados</p>
          ) : (
            <div className="space-y-3">
              {work.registrations.map((reg) => (
                <div key={reg.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{reg.society}</span>
                    <Badge variant="outline" className="text-xs">{reg.status}</Badge>
                  </div>
                  <dl className="grid gap-2 sm:grid-cols-3 text-sm">
                    <div><dt className="text-muted-foreground">Estado</dt><dd>{reg.status}</dd></div>
                    <div><dt className="text-muted-foreground">Enviado</dt><dd>{reg.submittedAt ? new Date(reg.submittedAt).toLocaleDateString() : "—"}</dd></div>
                    <div><dt className="text-muted-foreground">Referencia</dt><dd>{reg.referenceId || "—"}</dd></div>
                    <div><dt className="text-muted-foreground">Método</dt><dd>{reg.method}</dd></div>
                    <div className="sm:col-span-3"><dt className="text-muted-foreground">Notas</dt><dd>{reg.notes || "—"}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" onClick={() => { setRegistrations(work.registrations.map((r) => ({ ...r }))); setIdentifiers({ iswc: work.iswc || "", bmiWorkId: work.bmiWorkId || "", mlcSongCode: work.mlcSongCode || "" }); }}>Editar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <h4 className="font-medium">Identificadores de sociedad</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <EditableField label="ISWC" value={identifiers.iswc} onChange={(v) => setIdentifiers({ ...identifiers, iswc: v })} error={errors.iswc} placeholder="T-123.456.789-0" />
          <EditableField label="BMI Work ID" value={identifiers.bmiWorkId} onChange={(v) => setIdentifiers({ ...identifiers, bmiWorkId: v })} />
          <EditableField label="MLC Song Code" value={identifiers.mlcSongCode} onChange={(v) => setIdentifiers({ ...identifiers, mlcSongCode: v })} />
        </div>

        <h4 className="font-medium pt-2 border-t">Registros por sociedad</h4>
        {registrations.map((reg, idx) => (
          <div key={reg.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Select value={reg.society} onValueChange={(v) => { const updated = [...registrations]; updated[idx] = { id: reg.id, workId: reg.workId, society: v, status: reg.status, submittedAt: reg.submittedAt, completedAt: reg.completedAt, referenceId: reg.referenceId, method: reg.method, notes: reg.notes }; setRegistrations(updated); }}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BMI">BMI</SelectItem>
                  <SelectItem value="MLC">MLC</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reg.status} onValueChange={(v) => { const updated = [...registrations]; updated[idx] = { id: reg.id, workId: reg.workId, society: reg.society, status: v as Registration["status"], submittedAt: reg.submittedAt, completedAt: reg.completedAt, referenceId: reg.referenceId, method: reg.method, notes: reg.notes }; setRegistrations(updated); }}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">No iniciado</SelectItem>
                  <SelectItem value="ready">Listo</SelectItem>
                  <SelectItem value="submitted">Enviado</SelectItem>
                  <SelectItem value="processing">En proceso</SelectItem>
                  <SelectItem value="registered">Registrado</SelectItem>
                  <SelectItem value="needs_correction">Requiere corrección</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <EditableField type="date" label="Fecha envío" value={reg.submittedAt ? reg.submittedAt.split("T")[0] : ""} onChange={(v) => { const updated = [...registrations]; updated[idx] = { id: reg.id, workId: reg.workId, society: reg.society, status: reg.status, submittedAt: v ? new Date(v).toISOString() : null, completedAt: reg.completedAt, referenceId: reg.referenceId, method: reg.method, notes: reg.notes }; setRegistrations(updated); }} />
              <EditableField label="Referencia" value={reg.referenceId || ""} onChange={(v) => { const updated = [...registrations]; updated[idx] = { id: reg.id, workId: reg.workId, society: reg.society, status: reg.status, submittedAt: reg.submittedAt, completedAt: reg.completedAt, referenceId: v || null, method: reg.method, notes: reg.notes }; setRegistrations(updated); }} />
              <EditableField label="Método" value={reg.method} onChange={(v) => { const updated = [...registrations]; updated[idx] = { id: reg.id, workId: reg.workId, society: reg.society, status: reg.status, submittedAt: reg.submittedAt, completedAt: reg.completedAt, referenceId: reg.referenceId, method: v as Registration["method"], notes: reg.notes }; setRegistrations(updated); }} />
            </div>
            <EditableField type="textarea" label="Notas" value={reg.notes || ""} onChange={(v) => { const updated = [...registrations]; updated[idx] = { id: reg.id, workId: reg.workId, society: reg.society, status: reg.status, submittedAt: reg.submittedAt, completedAt: reg.completedAt, referenceId: reg.referenceId, method: reg.method, notes: v }; setRegistrations(updated); }} />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setRegistrations([...registrations, { id: makeId(), workId: work.id, society: "BMI", status: "not_started", submittedAt: null, completedAt: null, referenceId: null, method: "manual", notes: "" }])} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Agregar registro
        </Button>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave}>Guardar</Button>
      </div>
    </div>
  );
}

function DocumentsSection() {
  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <FileUp className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">Gestión de documentos (split sheets, contratos, certificados) — Disponible en la próxima fase</p>
    </div>
  );
}

function HistorySection({ work }: { work: PublishingWork }) {
  const auditLog = usePublishingStore((s) => s.getAuditLog(work.id));

  if (auditLog.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <History className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">Sin cambios registrados aún</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <ul className="space-y-3">
        {auditLog.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3 text-sm py-2 border-b last:border-0">
            <div className="flex-shrink-0 w-8 text-center text-[10px] text-muted-foreground">
              {new Date(entry.changedAt).toLocaleTimeString()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{entry.field}</span>
                <Badge variant="outline" className="text-[10px]">{entry.entityType}</Badge>
                <Badge variant="outline" className="text-[10px]">{entry.source}</Badge>
              </div>
              <div className="text-muted-foreground font-mono text-xs">
                {entry.oldValue !== null ? `«${entry.oldValue}»` : "—"} → {entry.newValue !== null ? `«${entry.newValue}»` : "—"}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  requireTitleMatch,
  targetTitle,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  requireTitleMatch?: boolean;
  targetTitle?: string;
  onConfirm: (title?: string) => void;
}) {
  const [inputTitle, setInputTitle] = useState("");

  const handleConfirm = () => {
    if (requireTitleMatch && inputTitle !== targetTitle) return;
    onConfirm(requireTitleMatch ? inputTitle : undefined);
    onOpenChange(false);
    setInputTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {requireTitleMatch && (
          <div className="mt-4 space-y-2">
            <Label className="text-sm font-medium">Escribe el título para confirmar</Label>
            <Input value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} placeholder={targetTitle} />
            <p className="text-xs text-muted-foreground">Debe coincidir exactamente</p>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={requireTitleMatch && inputTitle !== targetTitle}>
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkSheetPageContent({ workId, returnTo, now }: { workId: string; returnTo: string; now: Date }) {
  const navigate = useNavigate();
  const work = useWork(workId);
  const parties = usePublishingStore((s) => s.parties);
  const partiesRecord = useMemo(() => Object.fromEntries(parties.map((p) => [p.id, p])), [parties]);

  const blocker = useMemo(() => work ? getPrimaryBlocker(work, now, DEFAULT_NO_RESPONSE_DAYS) : null, [work, now]);

  const [activeSection, setActiveSection] = useState<SectionId>("summary");
  const [editingSection, setEditingSection] = useState<SectionId | null>(null);
  const [originalWork, setOriginalWork] = useState<PublishingWork | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const needsTitleConfirm = work ? (work.registrations.some((r) => ["submitted", "registered"].includes(r.status)) || work.splitAgreement?.status === "signed") : false;

  const handleBack = () => navigate({ to: returnTo });

  const handleAction = (w: PublishingWork, action: string) => {
    if (action === "Agregar ISRC" || action === "Registrar identificador") {
      // handled by header buttons
    }
  };

  const handleOpenIdentifier = (w: PublishingWork, kind: "isrc" | "iswc") => {
    // The header buttons open the dialog directly
  };

  const handleSave = (updatedWork: PublishingWork) => {
    usePublishingStore.getState().upsertWork(updatedWork);
    setOriginalWork(null);
    setEditingSection(null);
  };

  const handleCancel = () => {
    if (originalWork) {
      usePublishingStore.getState().upsertWork(originalWork);
    }
    setOriginalWork(null);
    setEditingSection(null);
  };

  const startEdit = (section: SectionId) => {
    if (work) {
      setOriginalWork({ ...work });
      setEditingSection(section);
    }
  };

  const handleDelete = () => {
    if (!work) return;
    usePublishingStore.getState().deleteWork(work.id);
    navigate({ to: returnTo });
  };

  const handleArchive = () => {
    if (!work) return;
    const archived = { ...work, status: "draft" as const, updatedAt: new Date().toISOString() };
    usePublishingStore.getState().upsertWork(archived);
    setArchiveDialogOpen(false);
  };

  if (!work) {
    return <WorkNotFound returnTo={returnTo} />;
  }

  const renderSection = () => {
    switch (activeSection) {
      case "summary":
        return <SummarySection work={work} parties={partiesRecord} now={now} />;
      case "details":
        return <DetailsSection work={work} onSave={handleSave} onCancel={handleCancel} isEditing={editingSection === "details"} originalWork={originalWork!} />;
      case "writers":
        return <WritersSection work={work} parties={partiesRecord} onSave={handleSave} onCancel={handleCancel} isEditing={editingSection === "writers"} originalWork={originalWork!} />;
      case "publisher":
        return <PublisherSection work={work} parties={partiesRecord} onSave={handleSave} onCancel={handleCancel} isEditing={editingSection === "publisher"} originalWork={originalWork!} />;
      case "recordings":
        return <RecordingsSection work={work} onSave={handleSave} onCancel={handleCancel} isEditing={editingSection === "recordings"} originalWork={originalWork!} onOpenIdentifier={handleOpenIdentifier} />;
      case "registrations":
        return <RegistrationsSection work={work} onSave={handleSave} onCancel={handleCancel} isEditing={editingSection === "registrations"} originalWork={originalWork!} />;
      case "documents":
        return <DocumentsSection />;
      case "history":
        return <HistorySection work={work} />;
      default:
        return <SummarySection work={work} parties={partiesRecord} now={now} />;
    }
  };

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <SectionNav activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <StickyHeader
            work={work}
            blocker={blocker!}
            onBack={handleBack}
            onAction={handleAction}
            onOpenIdentifier={handleOpenIdentifier}
            onArchive={() => setArchiveDialogOpen(true)}
            onDelete={() => setDeleteDialogOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-4 lg:pl-0">
            <div className="max-w-5xl mx-auto">
              {renderSection()}
            </div>
          </main>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar obra"
        description={`¿Eliminar "${work.title}"? Esta acción no se puede deshacer.`}
        requireTitleMatch={needsTitleConfirm}
        targetTitle={work.title}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archivar obra"
        description={`La obra "${work.title}" pasará a estado "Borrador" y se ocultará de la lista principal.`}
        onConfirm={handleArchive}
      />
    </>
  );
}

export function WorkSheetPage() {
  const { workId } = useParams({ from: "/publishing/obras/$workId" });
  const search = useSearch({ from: "/publishing/obras/$workId" });
  const { returnTo } = search;

  const _hasHydrated = usePublishingStore((s) => s._hasHydrated);
  const now = useNow();

  useEffect(() => {
    rehydrateStore();
    registerHydrationCallbacks();
  }, []);

  if (!_hasHydrated || now === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-muted-foreground">Cargando…</div>
      </div>
    );
  }

  return <WorkSheetPageContent workId={workId} returnTo={returnTo} now={now} />;
}