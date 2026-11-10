import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  Check,
  FileUp,
  FileText,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";

import { PageHeader, Pill, Tile } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { demoWorks } from "@/lib/publishing/demo-data";
import { usePublishingStore, rehydrateStore, registerHydrationCallbacks } from "@/lib/publishing/store";
import {
  hasValidSplits,
  normalizeIsrc,
  validateIpi,
  validateIsrc,
  validateReadyToRegister,
  validateSplits,
  validateUniqueIsrc,
} from "@/lib/publishing/validation";
import { useNow } from "@/lib/publishing/queries";
import type {
  Party,
  PublishingWork,
  WorkStatus,
  WriterRole,
  Section,
} from "@/lib/publishing/types";
import { cn } from "@/lib/utils";
import type { WorkFilter, SearchParams, PendingTask, IssueCounts } from "@/lib/publishing/queries";
import {
  getIssueCounts,
  getPendingTasks,
  DEFAULT_NO_RESPONSE_DAYS,
  filterWorks,
  computeCompleteness,
  makeId,
  normalizeText,
} from "@/lib/publishing/queries";
import { PendingQueue } from "./PendingQueue";
import { FilterBar } from "./FilterBar";
import { WorksTable } from "./WorksTable";
import { IdentifierDialog } from "./IdentifierDialog";
import { savedViewsStore } from "@/lib/publishing/saved-views";
type IssueFilter =
  | "all"
  | "without-isrc"
  | "without-iswc"
  | "without-mlc"
  | "unsigned"
  | "registration-pending"
  | "correction";
type WorkDraft = {
  title: string;
  alternateTitles: string;
  language: string;
  durationSeconds: string;
  sampleFlag: boolean;
  sampleNotes: string;
  controlledSharePercent: string;
  hasContract: boolean;
  writerName: string;
  writerSharePercent: string;
  secondWriterName: string;
  secondWriterSharePercent: string;
  publisherSharePercent: string;
  artistPartyId: string;
  releaseDate: string;
  distributor: string;
  isrc: string;
  versionNote: string;
};

const blankDraft: WorkDraft = {
  title: "",
  alternateTitles: "",
  language: "Español",
  durationSeconds: "",
  sampleFlag: false,
  sampleNotes: "",
  controlledSharePercent: "100",
  hasContract: false,
  writerName: "",
  writerSharePercent: "100",
  secondWriterName: "",
  secondWriterSharePercent: "0",
  publisherSharePercent: "100",
  artistPartyId: "",
  releaseDate: "",
  distributor: "",
  isrc: "",
  versionNote: "",
};

const statusNames: Record<WorkStatus, string> = {
  draft: "Borrador",
  splits_pending: "Splits pendientes",
  splits_signed: "Splits firmados",
  ready_to_register: "Lista para registrar",
  submitted: "Enviada a BMI/MLC",
  released: "Lanzada",
  iswc_pending: "ISWC pendiente",
  verified: "Verificada",
  needs_correction: "Requiere corrección",
};

const statusStyles: Record<WorkStatus, string> = {
  draft: "bg-secondary text-secondary-foreground",
  splits_pending: "bg-cream text-primary",
  splits_signed: "bg-lavender text-ink",
  ready_to_register: "bg-blue text-foreground",
  submitted: "bg-primary text-primary-foreground",
  released: "bg-mint text-ink",
  iswc_pending: "bg-olive text-ink",
  verified: "bg-mint text-ink",
  needs_correction: "bg-destructive text-destructive-foreground",
};

const statusOrder: WorkStatus[] = [
  "draft",
  "splits_pending",
  "splits_signed",
  "ready_to_register",
  "submitted",
  "released",
  "iswc_pending",
  "verified",
  "needs_correction",
];

const issueFilterNames: Record<IssueFilter, string> = {
  all: "Todas",
  "without-isrc": "Sin ISRC",
  "without-iswc": "Sin ISWC",
  "without-mlc": "Sin MLC Song Code",
  unsigned: "Splits sin firmar",
  "registration-pending": "Registros pendientes",
  correction: "Requieren corrección",
};

const sectionNames: Record<Section, string> = {
  overview: "Pendientes",
  works: "Obras",
  people: "Personas",
  recordings: "Grabaciones",
  imports: "Importar",
};

function newWork(draft: WorkDraft, parties: Party[], works: PublishingWork[]): PublishingWork {
  const now = new Date().toISOString();
  const id = makeId();
  return {
    id,
    title: draft.title,
    alternateTitles: draft.alternateTitles.split(",").map((s) => s.trim()).filter(Boolean),
    language: draft.language,
    durationSeconds: Number(draft.durationSeconds) || 0,
    versionNote: draft.versionNote,
    isDerivative: false,
    status: draft.writerName.trim() ? "splits_pending" : "draft",
    iswc: null,
    bmiWorkId: null,
    mlcSongCode: null,
    internalCode: `CRB-${new Date().getFullYear()}-${String(works.length + 1).padStart(3, "0")}`,
    hasContract: draft.hasContract,
    sampleFlag: draft.sampleFlag,
    sampleNotes: draft.sampleNotes,
    controlledSharePercent: Number(draft.controlledSharePercent) || 0,
    notes: "",
    writers: draft.writerName.trim()
      ? [
          {
            partyId: makeId(),
            role: "composer_lyricist" as WriterRole,
            writerSharePercent: Number(draft.writerSharePercent) || 100,
            controlled: true,
          },
        ]
      : [],
    publishers: [
      {
        partyId: makeId(),
        publisherSharePercent: Number(draft.publisherSharePercent) || 100,
        isOwn: false,
        administratorPartyId: null,
        agreementNumber: null,
      },
    ],
    recordings: draft.isrc
      ? [
          {
            id: makeId(),
            workId: id,
            releaseId: null,
            title: draft.title,
            versionTitle: "",
            artistPartyId: draft.artistPartyId || null,
            isrc: draft.isrc.toUpperCase().replace(/-/g, ""),
            durationSeconds: Number(draft.durationSeconds) || 0,
            releaseDate: draft.releaseDate || null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ]
      : [],
    registrations: [],
    splitAgreement: {
      id: makeId(),
      workId: id,
      status: "draft",
      signedAt: null,
      documentUrl: null,
      version: 1,
      notes: "",
      confirmations: [],
    },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function PublishingWorkspaceContent({ search, now }: { search: SearchParams; now: Date }) {
  const navigate = useNavigate();
  const works = usePublishingStore((s) => s.works);
  const parties = usePublishingStore((s) => s.parties);
  const [section, setSection] = useState<Section>(search.section);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [draft, setDraft] = useState<WorkDraft>(blankDraft);
  const [boardView, setBoardView] = useState<"list" | "kanban">("list");
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [recordingInputs, setRecordingInputs] = useState<Record<string, string>>({});
  const [recordingErrors, setRecordingErrors] = useState<Record<string, string>>({});
  const [wizardIsrcError, setWizardIsrcError] = useState("");
  const [page, setPage] = useState(search.page);
  const [pageSize, setPageSize] = useState(search.pageSize);

  const visibleWorks = works.filter((work) => work.deletedAt === null);

  const issueCounts: IssueCounts = useMemo(() => getIssueCounts(visibleWorks), [visibleWorks]);
  const pendingTasks: PendingTask[] = useMemo(
    () => getPendingTasks(visibleWorks, now, DEFAULT_NO_RESPONSE_DAYS),
    [visibleWorks, now],
  );

  const partiesRecord = useMemo(() => Object.fromEntries(parties.map((p) => [p.id, p])), [parties]);

  const filteredWorks = useMemo(
    () => filterWorks(visibleWorks, search.filter),
    [visibleWorks, search.filter],
  );

  const updateSearch = (partial: Partial<SearchParams>) => {
    const nextFilter = { ...search.filter };
    if (partial.filter) {
      for (const [key, value] of Object.entries(partial.filter)) {
        if (value === undefined || value === false) {
          delete nextFilter[key as keyof WorkFilter];
        } else {
          (nextFilter as any)[key] = value;
        }
      }
    }
    const next: SearchParams = {
      filter: nextFilter,
      section: partial.section ?? search.section,
      page: partial.page ?? search.page,
      pageSize: partial.pageSize ?? search.pageSize,
    };
    const sp = new URLSearchParams();
    if (next.section) sp.set("section", next.section);
    if (next.filter.status) sp.set("status", next.filter.status);
    if (next.filter.bmi) sp.set("bmi", next.filter.bmi);
    if (next.filter.mlc) sp.set("mlc", next.filter.mlc);
    if (next.filter.missingIsrc) sp.set("missingIsrc", "1");
    if (next.filter.missingIswc) sp.set("missingIswc", "1");
    if (next.filter.missingMlcSongCode) sp.set("missingMlcSongCode", "1");
    if (next.filter.split) sp.set("split", next.filter.split);
    if (next.filter.artist) sp.set("artist", next.filter.artist);
    if (next.filter.composer) sp.set("composer", next.filter.composer);
    if (next.filter.publisher) sp.set("publisher", next.filter.publisher);
    if (next.filter.releaseFrom) sp.set("releaseFrom", next.filter.releaseFrom);
    if (next.filter.releaseTo) sp.set("releaseTo", next.filter.releaseTo);
    if (next.filter.hasContract !== undefined)
      sp.set("hasContract", next.filter.hasContract ? "1" : "0");
    if (next.filter.hasSample !== undefined) sp.set("hasSample", next.filter.hasSample ? "1" : "0");
    if (next.filter.search) sp.set("search", next.filter.search);
    if (next.filter.sort) sp.set("sort", next.filter.sort);
    if (next.filter.sortDir) sp.set("sortDir", next.filter.sortDir);
    sp.set("page", String(next.page));
    sp.set("pageSize", String(next.pageSize));
    navigate({ search: sp.toString() } as any);
  };

  const draftWriterNames = [draft.writerName, draft.secondWriterName]
    .map(normalizeText)
    .filter(Boolean)
    .sort();
  const duplicateWork =
    Boolean(draft.title.trim() && draftWriterNames.length) &&
    visibleWorks.some((work) => {
      const existingWriterNames = work.writers
        .map((writer) => parties.find((party) => party.id === writer.partyId)?.legalName ?? "")
        .map(normalizeText)
        .filter(Boolean)
        .sort();
      return (
        normalizeText(work.title) === normalizeText(draft.title) &&
        existingWriterNames.length === draftWriterNames.length &&
        existingWriterNames.every((name, index) => name === draftWriterNames[index])
      );
    });
  const draftSplitWork = useMemo<PublishingWork>(
    () => ({
      ...demoWorks[3]!,
      title: draft.title,
      sampleFlag: draft.sampleFlag,
      sampleNotes: draft.sampleNotes,
      controlledSharePercent: Number(draft.controlledSharePercent) || 0,
      writers: [
        ...(draft.writerName.trim()
          ? [
              {
                partyId: makeId(),
                role: "composer_lyricist" as WriterRole,
                writerSharePercent: Number(draft.writerSharePercent) || 0,
                controlled: true,
              },
            ]
          : []),
        ...(draft.secondWriterName.trim()
          ? [
              {
                partyId: makeId(),
                role: "composer_lyricist" as WriterRole,
                writerSharePercent: Number(draft.secondWriterSharePercent) || 0,
                controlled: true,
              },
            ]
          : []),
      ],
      publishers: [
        {
          partyId: makeId(),
          publisherSharePercent: Number(draft.publisherSharePercent) || 100,
          isOwn: false,
          administratorPartyId: null,
          agreementNumber: null,
        },
      ],
      artistPartyId: draft.artistPartyId || null,
      recordings: draft.isrc
        ? [
            {
              id: makeId(),
              workId: "draft",
              releaseId: null,
              title: draft.title,
              versionTitle: "",
              artistPartyId: draft.artistPartyId || null,
              isrc: draft.isrc.toUpperCase().replace(/-/g, ""),
              durationSeconds: Number(draft.durationSeconds) || 0,
              releaseDate: draft.releaseDate || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null,
            },
          ]
        : [],
      updatedAt: new Date().toISOString(),
    }),
    [draft],
  );
  const draftIssues = validateReadyToRegister(draftSplitWork);

  const updateDraft = <K extends keyof WorkDraft>(key: K, value: WorkDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const handleWizardNext = () => {
    if (wizardStep === 1 && !draft.title.trim()) {
      setWizardIsrcError("El título es obligatorio");
      return;
    }
    if (wizardStep === 2 && Number(draft.writerSharePercent) + Number(draft.secondWriterSharePercent) !== 100) {
      setWizardIsrcError("Los porcentajes de compositores deben sumar 100%");
      return;
    }
    if (wizardStep < 3) setWizardStep(wizardStep + 1);
  };

  const handleWizardPrev = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  const handleWizardFinish = () => {
    const nextParties = [...parties];
    const work = newWork(draft, nextParties, works);
    work.status = work.writers.length ? "splits_pending" : "draft";
    usePublishingStore.getState().upsertWork(work);
    nextParties.forEach((p) => usePublishingStore.getState().upsertParty(p));
    navigate({ to: `/publishing/obras/${work.id}`, search: { returnTo: "/publishing" } });
    updateSearch({ section: "works", page: 1 });
    setShowWizard(false);
  };

  const handleCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
    setCsvPreview(rows.slice(0, 7));
  };

  const saveCsvPreview = () => {
    if (csvPreview.length < 2) return;
    const headers = csvPreview[0]!.map((header) => header.toLowerCase());
    const titleIndex = headers.indexOf("title");
    if (titleIndex < 0) return;
    const now = new Date().toISOString();
    const additions = csvPreview
      .slice(1)
      .map((row, index) => {
        const title = row[titleIndex]?.trim();
        if (!title) return null;
        const duplicate = visibleWorks.some(
          (work) => work.title.toLowerCase() === title.toLowerCase(),
        );
        if (duplicate) return null;
        const base = {
          ...demoWorks[3]!,
          id: makeId(),
          title,
          internalCode: `CRB-${new Date().getFullYear()}-IMP${index + 1}`,
          createdAt: now,
          updatedAt: now,
        };
        return base;
      })
      .filter((work): work is PublishingWork => work !== null);
    additions.forEach((w) => usePublishingStore.getState().upsertWork(w));
    setCsvPreview([]);
    updateSearch({ section: "works", page: 1 });
  };

  const handleIsrc = (work: PublishingWork) => {
    const isrc = recordingInputs[work.id]?.trim();
    if (!isrc) return;
    const invalid = validateIsrc(isrc)[0];
    if (invalid) {
      setRecordingErrors((current) => ({ ...current, [work.id]: invalid.message }));
      return;
    }
    const duplicate = validateUniqueIsrc(
      isrc,
      visibleWorks.flatMap((item) => item.recordings),
    )[0];
    if (duplicate) {
      setRecordingErrors((current) => ({ ...current, [work.id]: duplicate.message }));
      return;
    }
    const timestamp = new Date().toISOString();
    const normalizedIsrc = normalizeIsrc(isrc);
    const updatedWork = visibleWorks.find((w) => w.id === work.id);
    if (updatedWork) {
      const newWork: PublishingWork = {
        ...updatedWork,
        status: "released",
        recordings: [
          ...updatedWork.recordings,
          {
            id: makeId(),
            workId: updatedWork.id,
            releaseId: null,
            title: updatedWork.title,
            versionTitle: "",
            artistPartyId: null,
            isrc: normalizedIsrc,
            durationSeconds: updatedWork.durationSeconds,
            releaseDate: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            deletedAt: null,
          },
        ],
        updatedAt: timestamp,
      };
      usePublishingStore.getState().upsertWork(newWork);
    }
    setRecordingInputs((current) => ({ ...current, [work.id]: "" }));
    setRecordingErrors((current) => ({ ...current, [work.id]: "" }));
  };

  const handleReadyForAgent = (work: PublishingWork) => {
    const issues = validateReadyToRegister(work).filter((issue) => issue.severity === "error");
    if (issues.length) return;
    const updatedWork = visibleWorks.find((w) => w.id === work.id);
    if (updatedWork) {
      const newWork: PublishingWork = {
        ...updatedWork,
        status: "ready_to_register",
        registrations: (["BMI", "MLC"] as const).map(
          (society) =>
            updatedWork.registrations.find((registration) => registration.society === society) ?? {
              id: makeId(),
              workId: updatedWork.id,
              society,
              status: "ready" as const,
              submittedAt: null,
              completedAt: null,
              referenceId: null,
              method: "agent" as const,
              notes: "",
            },
        ),
        updatedAt: new Date().toISOString(),
      };
      usePublishingStore.getState().upsertWork(newWork);
    }
  };

  const exportAllWorks = (works: PublishingWork[], parties: Party[], format: "csv" | "json") => {
    const data = works.map((work) => ({
      title: work.title,
      internalCode: work.internalCode,
      status: work.status,
      iswc: work.iswc,
      bmiWorkId: work.bmiWorkId,
      mlcSongCode: work.mlcSongCode,
      isrc: work.recordings.find((r) => r.isrc)?.isrc,
      writers: work.writers
        .map((w) => parties.find((p) => p.id === w.partyId)?.legalName ?? "Desconocido")
        .join("; "),
      publishers: work.publishers
        .map((p) => parties.find((p2) => p2.id === p.partyId)?.legalName ?? "Desconocido")
        .join("; "),
    }));
    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "publishing-works.json";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = Object.keys(data[0] ?? {});
      const rows = data.map((item) => headers.map((h) => item[h as keyof typeof item]));
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "publishing-works.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportJson = (work: PublishingWork, parties: Party[]) => {
    const writersData = work.writers.map((w) => ({
      ...w,
      party: parties.find((p) => p.id === w.partyId)?.legalName,
    }));
    const publishersData = work.publishers.map((p) => ({
      ...p,
      party: parties.find((p2) => p2.id === p.partyId)?.legalName,
    }));
    const data = {
      title: work.title,
      internalCode: work.internalCode,
      status: work.status,
      iswc: work.iswc,
      bmiWorkId: work.bmiWorkId,
      mlcSongCode: work.mlcSongCode,
      writers: writersData,
      publishers: publishersData,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${work.internalCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = (work: PublishingWork) => {
    const rows = [
      ["Título", work.title],
      ["Código interno", work.internalCode],
      ["Estado", work.status],
      ["ISWC", work.iswc ?? ""],
      ["BMI Work ID", work.bmiWorkId ?? ""],
      ["MLC Song Code", work.mlcSongCode ?? ""],
      ["ISRC", work.recordings.find((r) => r.isrc)?.isrc ?? ""],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${work.internalCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printMetadataSheet = (work: PublishingWork, parties: Party[]) => {
    const escapeHtml = (s: string) => s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
    const writerRows = work.writers
      .map((writer) => {
        const party = parties.find((p) => p.id === writer.partyId);
        return `<tr><td>${escapeHtml(party?.legalName ?? "Desconocido")}</td><td>${escapeHtml(party?.stageName ?? "")}</td><td>${writer.role}</td><td>${party?.pro ?? ""}</td><td>${party?.ipi ?? ""}</td><td>${writer.writerSharePercent}%</td><td>${writer.controlled ? "Sí" : "No"}</td></tr>`;
      })
      .join("");
    const publisherRows = work.publishers
      .map((publisher) => {
        const party = parties.find((p) => p.id === publisher.partyId);
        return `<tr><td>${escapeHtml(party?.legalName ?? "Desconocido")}</td><td>${party?.pro ?? ""}</td><td>${party?.ipi ?? ""}</td><td>${publisher.publisherSharePercent}%</td><td>${publisher.agreementNumber ?? ""}</td></tr>`;
      })
      .join("");
    const isrc = work.recordings.find((recording) => recording.isrc)?.isrc;
    const iswc = work.iswc;
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>${escapeHtml(work.title)} · Metadata</title><style>body{font:12px Arial,sans-serif;color:#171717;margin:28px}h1{font-size:24px;margin:0}h2{font-size:15px;margin:20px 0 8px}p{margin:5px 0}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #bbb;padding:6px;text-align:left}th{background:#eee}.muted{color:#555}.notice{margin-top:24px;font-size:10px}@media print{body{margin:14mm}}</style><h1>${escapeHtml(work.title || "Obra")}</h1><p class="muted">Código: ${work.internalCode} · Generado: ${new Date().toLocaleDateString("es-US")} · Versión 1</p><h2>Obra</h2><p>Título exacto: ${escapeHtml(work.title || "pendiente")} · Alternos: ${escapeHtml(work.alternateTitles.join(", ") || "pendiente")}</p><p>Idioma: ${escapeHtml(work.language || "pendiente")} · Duración: ${work.durationSeconds ? `${Math.floor(work.durationSeconds / 60)}:${String(work.durationSeconds % 60).padStart(2, "0")}` : "pendiente"} · Versión: ${escapeHtml(work.versionNote || "pendiente")}</p><p>Derivada o con samples: ${work.isDerivative || work.sampleFlag ? `Sí (${work.controlledSharePercent}% controlado)` : "No"} · Contrato: ${work.hasContract ? "Sí" : "No"}</p><h2>Compositores</h2><table><thead><tr><th>Nombre legal</th><th>Artístico</th><th>Rol</th><th>PRO</th><th>IPI</th><th>Writer %</th><th>Controlado</th></tr></thead><tbody>${writerRows || "<tr><td colspan='7'>pendiente</td></tr>"}</tbody></table><h2>Editoriales</h2><table><thead><tr><th>Nombre</th><th>PRO</th><th>IPI</th><th>Editorial %</th><th>Acuerdo</th></tr></thead><tbody>${publisherRows || "<tr><td colspan='5'>pendiente</td></tr>"}</tbody></table><h2>Totales</h2><p>Writer: ${work.writers.reduce((sum, writer) => sum + writer.writerSharePercent, 0)}% · Publisher: ${work.publishers.reduce((sum, publisher) => sum + publisher.publisherSharePercent, 0)}% · Total: ${work.writers.reduce((sum, writer) => sum + writer.writerSharePercent, 0) + work.publishers.reduce((sum, publisher) => sum + publisher.publisherSharePercent, 0)}%</p><p class="notice">Hoja generada en modo demo. Los datos no se envían a BMI/MLC.</p></html>`;
    const popup = window.open("", "_blank");
    if (!popup) {
      window.alert("Permite las ventanas emergentes para imprimir o guardar esta hoja como PDF.");
      return;
    }
    popup.document.write(html);
    popup.document.close();
  };

  return (
    <div className="h-screen flex flex-col">
      <PageHeader
        eyebrow="Publishing"
        title="Administra obras musicales, splits y registros editoriales en BMI y The MLC."
        actions={
          <Button
            onClick={() => {
              setShowWizard(true);
              setWizardStep(1);
              setDraft(blankDraft);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva obra
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground">
            Espacio de trabajo de demostración: los cambios viven solo en esta sesión del navegador y no
            se envían a BMI, The MLC ni a una base de datos.
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Secciones de Publishing">
            {(Object.keys(sectionNames) as Section[]).map((key) => (
              <Pill
                key={key}
                active={section === key}
                onClick={() => {
                  updateSearch({ section: key });
                }}
              >
                {sectionNames[key]}
              </Pill>
            ))}
          </nav>

          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground">
            Espacio de trabajo de demostración: los cambios viven solo en esta sesión del navegador y no
            se envían a BMI, The MLC ni a una base de datos.
          </div>

          {section === "overview" && (
            <PendingQueue
              works={visibleWorks}
              parties={partiesRecord}
              counts={issueCounts}
              now={now}
              onAction={(work, action) => {
                if (work.id) {
                  navigate({ to: `/publishing/obras/${work.id}`, search: { returnTo: "/publishing" } });
                } else {
                  updateSearch({ section: "works", page: 1 });
                }
              }}
              onOpenIdentifier={(work, kind) => {
                navigate({ to: `/publishing/obras/${work.id}`, search: { returnTo: "/publishing" } });
              }}
            />
          )}

          {section === "works" && (
            <div className="space-y-4">
              <FilterBar
                filter={search.filter}
                onChange={(chip, checked) => {
                  if (chip.kind === "search") {
                    updateSearch({ filter: { search: checked ? chip.value : "" } as Partial<WorkFilter>, page: 1 });
                  } else if (chip.kind === "status") {
                    updateSearch({ filter: { status: checked ? (chip.value as WorkFilter["status"]) : "all" } as Partial<WorkFilter>, page: 1 });
                  } else if (chip.kind === "bmi") {
                    updateSearch({ filter: { bmi: checked ? (chip.value as WorkFilter["bmi"]) : undefined } as Partial<WorkFilter>, page: 1 });
                  } else if (chip.kind === "mlc") {
                    updateSearch({ filter: { mlc: checked ? (chip.value as WorkFilter["mlc"]) : undefined } as Partial<WorkFilter>, page: 1 });
                  } else if (chip.kind === "flag") {
                    updateSearch({ filter: { [chip.value]: checked } as Partial<WorkFilter>, page: 1 });
                  } else if (chip.kind === "split") {
                    updateSearch({ filter: { split: checked ? chip.value : undefined } as Partial<WorkFilter>, page: 1 });
                  }
                }}
                onClear={() => {
                  updateSearch({ filter: { status: "all" } as Partial<WorkFilter>, page: 1 });
                }}
                activeChips={[
                  ...(search.filter.status && search.filter.status !== "all"
                    ? [{ kind: "status" as const, value: search.filter.status }]
                    : []),
                  ...(search.filter.bmi ? [{ kind: "bmi" as const, value: search.filter.bmi }] : []),
                  ...(search.filter.mlc ? [{ kind: "mlc" as const, value: search.filter.mlc }] : []),
                  ...(search.filter.missingIsrc ? [{ kind: "flag" as const, value: "missingIsrc" as const }] : []),
                  ...(search.filter.missingIswc ? [{ kind: "flag" as const, value: "missingIswc" as const }] : []),
                  ...(search.filter.missingMlcSongCode ? [{ kind: "flag" as const, value: "missingMlcSongCode" as const }] : []),
                  ...(search.filter.hasContract !== undefined ? [{ kind: "flag" as const, value: "hasContract" as const }] : []),
                  ...(search.filter.hasSample !== undefined ? [{ kind: "flag" as const, value: "hasSample" as const }] : []),
                  ...(search.filter.split ? [{ kind: "split" as const, value: search.filter.split }] : []),
                  ...(search.filter.search ? [{ kind: "search" as const, value: search.filter.search }] : []),
                ]}
                onSaveView={(name, filter) => {
                  savedViewsStore.save({ name, filter, createdAt: new Date().toISOString() });
                }}
                onLoadView={(filter) => {
                  updateSearch({ filter, page: 1 });
                }}
              />
              <WorksTable
                works={filteredWorks}
                parties={partiesRecord}
                onSelect={(work) => navigate({ to: `/publishing/obras/${work.id}`, search: { returnTo: "/publishing" } })}
                page={search.page}
                pageSize={search.pageSize}
                onPageChange={(page) => updateSearch({ page })}
                sort={search.filter.sort}
                sortDir={search.filter.sortDir}
                onSortChange={(sort, dir) => updateSearch({ filter: { sort, sortDir: dir } })}
              />
            </div>
          )}

          {section === "people" && (
            <Tile className="p-4">
              <h2 className="text-xl font-semibold mb-4">Personas</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {parties.map((party) => (
                  <div key={party.id} className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-lg font-medium text-secondary">
                        {party.legalName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold">{party.legalName}</h3>
                        <p className="text-sm text-muted-foreground">{party.stageName || "Sin nombre artístico"}</p>
                      </div>
                    </div>
                    <dl className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between"><dt className="text-muted-foreground">Tipo</dt><dd>{party.type === "writer" ? "Compositor" : party.type === "publisher" ? "Editorial" : "Otro"}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">IPI</dt><dd>{party.ipi ?? "Pendiente"}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">PRO</dt><dd>{party.pro ?? "Pendiente"}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Miembro PRO</dt><dd>{party.proMemberNumber ?? "Pendiente"}</dd></div>
                    </dl>
                  </div>
                ))}
              </div>
            </Tile>
          )}

          {section === "recordings" && (
            <Tile className="p-4">
              <h2 className="text-xl font-semibold mb-4">Grabaciones</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleWorks.flatMap((work) =>
                  work.recordings.map((recording) => (
                    <div key={recording.id} className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                      <h3 className="font-semibold">{recording.title}</h3>
                      <p className="text-sm text-muted-foreground">{work.title}</p>
                      <dl className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between"><dt className="text-muted-foreground">ISRC</dt><dd>{recording.isrc ?? "Pendiente"}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted-foreground">Duración</dt><dd>{recording.durationSeconds ? `${Math.floor(recording.durationSeconds / 60)}:${String(recording.durationSeconds % 60).padStart(2, "0")}` : "Pendiente"}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted-foreground">Fecha lanzamiento</dt><dd>{recording.releaseDate ?? "Pendiente"}</dd></div>
                      </dl>
                    </div>
                  ))
                )}
              </div>
            </Tile>
          )}

          {section === "imports" && (
            <Tile className="p-4">
              <h2 className="text-xl font-semibold mb-4">Importar CSV</h2>
              <Input type="file" accept=".csv" onChange={handleCsv} />
              {csvPreview.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Vista previa ({csvPreview.length - 1} filas):</p>
                  <div className="overflow-x-auto rounded-lg border max-h-64">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>{csvPreview[0]!.map((h) => <th key={h} className="p-2 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(1, 7).map((row, i) => (
                          <tr key={i}>{row.map((cell) => <td key={cell} className="p-2 border-t">{cell}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button className="mt-3" onClick={saveCsvPreview}>
                    Guardar como obras
                  </Button>
                </div>
              )}
            </Tile>
          )}
        </div>
      </div>
    </div>
  );
}

export function PublishingWorkspace({ search }: { search: SearchParams }) {
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

  return <PublishingWorkspaceContent search={search} now={now} />;
}