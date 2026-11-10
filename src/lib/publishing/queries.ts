import type { Party, PublishingWork, Section, WorkStatus } from "./types";
import {
  formatIsrc,
  formatIswc,
  hasValidSplits,
  normalizeIsrc,
  normalizeIswc,
  validateIsrc,
  validateIswc,
} from "./validation";

export function makeId(): string {
  return crypto.randomUUID();
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export type WorkSort = "title" | "status" | "completeness" | "releaseDate" | "updated";

export interface WorkFilter {
  section?: Section;
  status?: WorkStatus | "all";
  bmi?: "none" | "submitted" | "registered";
  mlc?: "none" | "submitted" | "registered";
  missingIsrc?: boolean;
  missingIswc?: boolean;
  missingMlcSongCode?: boolean;
  split?: "unsigned" | "signed";
  artist?: string;
  composer?: string;
  publisher?: string;
  releaseFrom?: string;
  releaseTo?: string;
  hasContract?: boolean;
  hasSample?: boolean;
  search?: string;
  sort?: WorkSort;
  sortDir?: "asc" | "desc";
}

export interface PendingTask {
  type: PendingTaskType;
  title: string;
  subtitle: string;
  actionLabel: string;
  works: PublishingWork[];
  count: number;
}

export type PendingTaskType =
  | "missing-isrc"
  | "missing-iswc"
  | "missing-bmi-work-id"
  | "missing-mlc-song-code"
  | "unsigned-split"
  | "ready-to-register"
  | "no-response"
  | "needs-correction";

export interface IssueCounts {
  "without-isrc": number;
  "without-iswc": number;
  "without-mlc": number;
  unsigned: number;
  "registration-pending": number;
  correction: number;
}

export const DEFAULT_NO_RESPONSE_DAYS = 14;

export function computeCompleteness(work: PublishingWork): number {
  const checks = [
    Boolean(work.title?.trim()),
    work.writers.length > 0,
    Boolean(work.recordings.find((r) => r.isrc)),
    Boolean(work.iswc),
    Boolean(work.mlcSongCode),
    work.recordings.length > 0,
    Boolean(latestReleaseDate(work)),
    hasValidSplits(work),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function isWorkMissingIsrc(work: PublishingWork): boolean {
  return !work.recordings.some((r) => r.isrc);
}

export function isWorkMissingIswc(work: PublishingWork): boolean {
  return !work.iswc;
}

export function isWorkMissingMlcSongCode(work: PublishingWork): boolean {
  return !work.mlcSongCode;
}

export function isSplitUnsigned(work: PublishingWork): boolean {
  return work.splitAgreement?.status !== "signed";
}

export function isReadyToRegister(work: PublishingWork): boolean {
  return work.status === "ready_to_register";
}

export function isNoResponse(work: PublishingWork, now: Date, thresholdDays: number): boolean {
  const bmi = work.registrations.find((r) => r.society === "BMI");
  const mlc = work.registrations.find((r) => r.society === "MLC");
  const latest = [bmi, mlc].filter(Boolean).reduce(
    (latest, r) => {
      if (!r?.submittedAt) return latest;
      const d = new Date(r.submittedAt);
      return !latest || d > latest ? d : latest;
    },
    null as Date | null,
  );
  if (!latest) return false;
  const diffDays = (now.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > thresholdDays;
}

export function getIssueCounts(works: PublishingWork[]): IssueCounts {
  return {
    "without-isrc": works.filter(isWorkMissingIsrc).length,
    "without-iswc": works.filter(isWorkMissingIswc).length,
    "without-mlc": works.filter(isWorkMissingMlcSongCode).length,
    unsigned: works.filter(isSplitUnsigned).length,
    "registration-pending": works.filter((w) =>
      w.registrations.some((r) => ["ready", "submitted", "processing"].includes(r.status)),
    ).length,
    correction: works.filter((w) => w.status === "needs_correction").length,
  };
}

export function getPendingTasks(
  works: PublishingWork[],
  now: Date,
  thresholdDays: number = DEFAULT_NO_RESPONSE_DAYS,
): PendingTask[] {
  const tasks: PendingTask[] = [
    {
      type: "missing-isrc",
      title: "Falta ISRC",
      subtitle: "Obras sin código ISRC en sus grabaciones",
      actionLabel: "Agregar ISRC",
      works: works.filter(isWorkMissingIsrc),
      count: 0,
    },
    {
      type: "missing-iswc",
      title: "Falta ISWC / Song Code / BMI Work ID",
      subtitle: "Obras sin identificadores de sociedad",
      actionLabel: "Registrar identificador",
      works: works.filter((w) => isWorkMissingIswc(w) || !w.bmiWorkId || !w.mlcSongCode),
      count: 0,
    },
    {
      type: "unsigned-split",
      title: "Split sin firmar",
      subtitle: "Obras con split sheet pendiente de firma",
      actionLabel: "Abrir split sheet",
      works: works.filter(isSplitUnsigned),
      count: 0,
    },
    {
      type: "ready-to-register",
      title: "Listo para registrar",
      subtitle: "Obras con splits listos para enviar a BMI y MLC",
      actionLabel: "Generar hoja de metadata",
      works: works.filter(isReadyToRegister),
      count: 0,
    },
    {
      type: "no-response",
      title: "Enviado y sin respuesta",
      subtitle: `Registros enviados hace más de ${thresholdDays} días sin novedad`,
      actionLabel: "Revisar registro",
      works: works.filter((w) => isNoResponse(w, now, thresholdDays)),
      count: 0,
    },
    {
      type: "needs-correction",
      title: "Requiere corrección",
      subtitle: "Obras que el solicitante devolvió para corregir",
      actionLabel: "Corregir",
      works: works.filter((w) => w.status === "needs_correction"),
      count: 0,
    },
  ];
  return tasks.map((t) => ({ ...t, count: t.works.length }));
}

export function filterWorks(works: PublishingWork[], filter: WorkFilter): PublishingWork[] {
  let result = [...works];

  if (filter.status && filter.status !== "all") {
    result = result.filter((w) => w.status === filter.status);
  }
  if (filter.bmi === "none") {
    result = result.filter((w) => !w.registrations.some((r) => r.society === "BMI"));
  }
  if (filter.bmi === "submitted") {
    result = result.filter(
      (w) =>
        w.registrations.some((r) => r.society === "BMI") &&
        !w.registrations.some((r) => r.society === "BMI" && r.status === "registered"),
    );
  }
  if (filter.bmi === "registered") {
    result = result.filter((w) =>
      w.registrations.some((r) => r.society === "BMI" && r.status === "registered"),
    );
  }
  if (filter.mlc === "none") {
    result = result.filter((w) => !w.registrations.some((r) => r.society === "MLC"));
  }
  if (filter.mlc === "submitted") {
    result = result.filter(
      (w) =>
        w.registrations.some((r) => r.society === "MLC") &&
        !w.registrations.some((r) => r.society === "MLC" && r.status === "registered"),
    );
  }
  if (filter.mlc === "registered") {
    result = result.filter((w) =>
      w.registrations.some((r) => r.society === "MLC" && r.status === "registered"),
    );
  }
  if (filter.missingIsrc) result = result.filter(isWorkMissingIsrc);
  if (filter.missingIswc) result = result.filter(isWorkMissingIswc);
  if (filter.missingMlcSongCode) result = result.filter(isWorkMissingMlcSongCode);
  if (filter.split === "unsigned") result = result.filter(isSplitUnsigned);
  if (filter.split === "signed") result = result.filter((w) => !isSplitUnsigned(w));
  if (filter.hasContract !== undefined) {
    result = result.filter((w) => w.hasContract === filter.hasContract);
  }
  if (filter.hasSample !== undefined) {
    result = result.filter((w) => Boolean(w.sampleFlag) === filter.hasSample);
  }
  if (filter.releaseFrom) {
    const from = new Date(filter.releaseFrom);
    result = result.filter((w) => {
      const rd = latestReleaseDate(w);
      return rd ? new Date(rd) >= from : false;
    });
  }
  if (filter.releaseTo) {
    const to = new Date(filter.releaseTo);
    result = result.filter((w) => {
      const rd = latestReleaseDate(w);
      return rd ? new Date(rd) <= to : false;
    });
  }
  if (filter.search) {
    const q = normalizeText(filter.search);
    result = result.filter((w) => {
      const haystack = [
        w.title,
        ...w.alternateTitles,
        w.internalCode,
        w.recordings.map((r) => r.title).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  const dir = filter.sortDir === "desc" ? -1 : 1;
  result.sort((a, b) => {
    let cmp = 0;
    switch (filter.sort) {
      case "title":
        cmp = normalizeText(a.title).localeCompare(normalizeText(b.title));
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "completeness":
        cmp = computeCompleteness(a) - computeCompleteness(b);
        break;
      case "releaseDate": {
        const da = latestReleaseDate(a) ? new Date(latestReleaseDate(a)!).getTime() : 0;
        const db = latestReleaseDate(b) ? new Date(latestReleaseDate(b)!).getTime() : 0;
        cmp = da - db;
        break;
      }
      case "updated": {
        const da = new Date(a.updatedAt).getTime();
        const db = new Date(b.updatedAt).getTime();
        cmp = da - db;
        break;
      }
      default:
        cmp = a.internalCode.localeCompare(b.internalCode);
    }
    return cmp * dir;
  });
  return result;
}

export interface SearchParams {
  filter: WorkFilter;
  section: Section;
  page: number;
  pageSize: number;
}

const SECTION_VALUES: Section[] = ["overview", "works", "people", "recordings", "imports"];
const STATUS_VALUES: Array<WorkStatus | "all"> = [
  "all",
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
const REGISTRATION_FILTER_VALUES = ["none", "submitted", "registered"] as const;
const SORT_VALUES: WorkSort[] = ["title", "status", "completeness", "releaseDate", "updated"];

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value !== undefined && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export type WorkFilterPatch = { [K in keyof WorkFilter]?: WorkFilter[K] | undefined };

/**
 * Forma plana de la URL (?tab=works&status=draft&page=2). Todo es opcional:
 * el router la usa como tipo de entrada de `navigate` y `Link`.
 */
export interface FlatSearchInput {
  tab?: string | undefined;
  section?: string | undefined;
  status?: string | undefined;
  bmi?: string | undefined;
  mlc?: string | undefined;
  missingIsrc?: boolean | string | number | undefined;
  missingIswc?: boolean | string | number | undefined;
  missingMlcSongCode?: boolean | string | number | undefined;
  split?: string | undefined;
  artist?: string | undefined;
  composer?: string | undefined;
  publisher?: string | undefined;
  releaseFrom?: string | undefined;
  releaseTo?: string | undefined;
  hasContract?: boolean | string | number | undefined;
  hasSample?: boolean | string | number | undefined;
  search?: string | undefined;
  sort?: string | undefined;
  sortDir?: string | undefined;
  page?: number | string | undefined;
  pageSize?: number | string | undefined;
}

function isTruthyFlag(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

function isFalsyFlag(value: string | undefined): boolean {
  return value === "0" || value === "false";
}

/**
 * Convierte lo que llega de la URL (objeto plano, valores ya parseados por el router)
 * en SearchParams. Los valores desconocidos caen al valor por defecto: nunca lanza.
 * También acepta la forma anidada antigua (?filter={...}) para no romper enlaces viejos.
 */
export function validateSearch(search: FlatSearchInput | Record<string, unknown>): SearchParams {
  const raw = search as Record<string, unknown>;
  const nestedFilter = raw["filter"];
  const filterSource: Record<string, unknown> =
    nestedFilter !== null && typeof nestedFilter === "object" && !Array.isArray(nestedFilter)
      ? (nestedFilter as Record<string, unknown>)
      : raw;

  const read = (source: Record<string, unknown>, key: string): string | undefined => {
    const val = source[key];
    if (val === undefined || val === null) return undefined;
    if (Array.isArray(val)) return val[0] === undefined ? undefined : String(val[0]);
    if (typeof val === "object") return undefined;
    return String(val);
  };
  const getStr = (key: string): string | undefined => read(filterSource, key);
  const getTop = (key: string): string | undefined => read(raw, key);

  const section =
    pick(getTop("tab"), SECTION_VALUES) ?? pick(getTop("section"), SECTION_VALUES) ?? "overview";
  const sortDir = getStr("sortDir") === "desc" ? "desc" : "asc";
  const page = Math.max(1, Math.floor(Number(getTop("page"))) || 1);
  const pageSizeVal = Number(getTop("pageSize"));
  const pageSize = [10, 25, 50, 100].includes(pageSizeVal) ? pageSizeVal : 25;

  const filter: WorkFilter = {};
  const status = pick(getStr("status"), STATUS_VALUES);
  if (status) filter.status = status;
  const bmi = pick(getStr("bmi"), REGISTRATION_FILTER_VALUES);
  if (bmi) filter.bmi = bmi;
  const mlc = pick(getStr("mlc"), REGISTRATION_FILTER_VALUES);
  if (mlc) filter.mlc = mlc;
  if (isTruthyFlag(getStr("missingIsrc"))) filter.missingIsrc = true;
  if (isTruthyFlag(getStr("missingIswc"))) filter.missingIswc = true;
  if (isTruthyFlag(getStr("missingMlcSongCode"))) filter.missingMlcSongCode = true;
  const split = pick(getStr("split"), ["unsigned", "signed"] as const);
  if (split) filter.split = split;
  const artist = getStr("artist");
  if (artist) filter.artist = artist;
  const composer = getStr("composer");
  if (composer) filter.composer = composer;
  const publisher = getStr("publisher");
  if (publisher) filter.publisher = publisher;
  const releaseFrom = getStr("releaseFrom");
  if (releaseFrom) filter.releaseFrom = releaseFrom;
  const releaseTo = getStr("releaseTo");
  if (releaseTo) filter.releaseTo = releaseTo;
  const hasContract = getStr("hasContract");
  if (isTruthyFlag(hasContract)) filter.hasContract = true;
  else if (isFalsyFlag(hasContract)) filter.hasContract = false;
  const hasSample = getStr("hasSample");
  if (isTruthyFlag(hasSample)) filter.hasSample = true;
  else if (isFalsyFlag(hasSample)) filter.hasSample = false;
  const searchStr = getStr("search");
  if (searchStr) filter.search = searchStr;
  const sort = pick(getStr("sort"), SORT_VALUES);
  if (sort) filter.sort = sort;
  filter.sortDir = sortDir;

  return { filter, section, page, pageSize };
}

/**
 * Inverso de validateSearch: objeto plano y mínimo (omite valores por defecto)
 * listo para pasar a `navigate({ search })`.
 */
export function toFlatSearch(params: SearchParams): FlatSearchInput {
  const f = params.filter;
  const out: FlatSearchInput = {};
  if (params.section !== "overview") out.tab = params.section;
  if (f.status && f.status !== "all") out.status = f.status;
  if (f.bmi) out.bmi = f.bmi;
  if (f.mlc) out.mlc = f.mlc;
  if (f.missingIsrc) out.missingIsrc = true;
  if (f.missingIswc) out.missingIswc = true;
  if (f.missingMlcSongCode) out.missingMlcSongCode = true;
  if (f.split) out.split = f.split;
  if (f.artist) out.artist = f.artist;
  if (f.composer) out.composer = f.composer;
  if (f.publisher) out.publisher = f.publisher;
  if (f.releaseFrom) out.releaseFrom = f.releaseFrom;
  if (f.releaseTo) out.releaseTo = f.releaseTo;
  if (f.hasContract !== undefined) out.hasContract = f.hasContract;
  if (f.hasSample !== undefined) out.hasSample = f.hasSample;
  if (f.search) out.search = f.search;
  if (f.sort) out.sort = f.sort;
  if (f.sortDir === "desc") out.sortDir = "desc";
  if (params.page > 1) out.page = params.page;
  if (params.pageSize !== 25) out.pageSize = params.pageSize;
  return out;
}

/**
 * Lo que el router guarda en la URL: la forma plana mínima y ya validada.
 * (El router escribe en la URL lo que devuelve validateSearch, por eso no puede ser anidado.)
 */
export function normalizeSearch(
  search: FlatSearchInput | Record<string, unknown>,
): FlatSearchInput {
  return toFlatSearch(validateSearch(search));
}

export function serializeSearch(params: SearchParams): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(toFlatSearch(params))) {
    if (value !== undefined) sp.set(key, String(value));
  }
  return sp.toString();
}

/** Solo se permiten retornos internos al módulo (evita redirecciones a otros sitios). */
export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/publishing";
  if (!value.startsWith("/publishing") || value.startsWith("//")) return "/publishing";
  return value;
}

export function validateIdentifier(
  kind: "isrc" | "iswc",
  value: string,
): { valid: boolean; formatted: string; issues: string[] } {
  const normalized = kind === "isrc" ? normalizeIsrc(value) : normalizeIswc(value);
  const issues: string[] = [];
  if (kind === "isrc") {
    const v = validateIsrc(normalized);
    if (v.length) issues.push(v[0]?.message ?? "");
  } else {
    const v = validateIswc(normalized);
    if (v.length) issues.push(v[0]?.message ?? "");
  }
  const formatted = kind === "isrc" ? formatIsrc(normalized) : formatIswc(normalized);
  return { valid: issues.length === 0, formatted, issues };
}

export function latestReleaseDate(work: PublishingWork): string | undefined {
  return work.recordings.find((r) => r.releaseDate)?.releaseDate ?? undefined;
}

export type BlockerType =
  | "needs-correction"
  | "unsigned-split"
  | "ready-to-register"
  | "no-response"
  | "missing-isrc"
  | "missing-identifiers";

export interface BlockerInfo {
  type: BlockerType;
  label: string;
  waitingText: string;
  actionLabel: string;
  actionDisabled: boolean;
  priority: "high" | "medium" | "low";
  daysSince: number;
  additionalBlockers: string[];
}

const BLOCKER_PRIORITY: Record<BlockerType, number> = {
  "needs-correction": 0,
  "unsigned-split": 1,
  "ready-to-register": 2,
  "no-response": 3,
  "missing-isrc": 4,
  "missing-identifiers": 5,
};

const PRIORITY_THRESHOLDS = {
  low: 14,
  medium: 30,
};

function getPriority(days: number): "high" | "medium" | "low" {
  if (days > PRIORITY_THRESHOLDS.medium) return "high";
  if (days >= PRIORITY_THRESHOLDS.low) return "medium";
  return "low";
}

function getDaysSinceReleaseOrUpdated(work: PublishingWork, now: Date): number {
  const releaseDate = latestReleaseDate(work);
  if (releaseDate) {
    const diff = (now.getTime() - new Date(releaseDate).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.floor(diff));
  }
  const diff = (now.getTime() - new Date(work.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.floor(diff));
}

function getNoResponseDays(work: PublishingWork, now: Date): number {
  const bmi = work.registrations.find((r) => r.society === "BMI");
  const mlc = work.registrations.find((r) => r.society === "MLC");
  const latest = [bmi, mlc].filter(Boolean).reduce(
    (latest, r) => {
      if (!r?.submittedAt) return latest;
      const d = new Date(r.submittedAt);
      return !latest || d > latest ? d : latest;
    },
    null as Date | null,
  );
  if (!latest) return 0;
  return Math.floor((now.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24));
}

export function getPrimaryBlocker(
  work: PublishingWork,
  now: Date,
  noResponseThresholdDays: number = DEFAULT_NO_RESPONSE_DAYS,
): BlockerInfo {
  const blockers: BlockerInfo[] = [];
  const daysSince = getDaysSinceReleaseOrUpdated(work, now);
  const noResponseDays = getNoResponseDays(work, now);
  const isNoResp = isNoResponse(work, now, noResponseThresholdDays);

  if (work.status === "needs_correction") {
    blockers.push({
      type: "needs-correction",
      label: "Requiere corrección",
      waitingText: "Devuelta para corrección",
      actionLabel: "Corregir",
      actionDisabled: false,
      priority: "high",
      daysSince,
      additionalBlockers: [],
    });
  }

  if (isSplitUnsigned(work)) {
    blockers.push({
      type: "unsigned-split",
      label: "Split sin firmar",
      waitingText: `Split sin firmar · ${daysSince} días`,
      actionLabel: "Abrir split sheet",
      actionDisabled: true,
      priority: getPriority(daysSince),
      daysSince,
      additionalBlockers: [],
    });
  }

  if (isReadyToRegister(work)) {
    blockers.push({
      type: "ready-to-register",
      label: "Listo para registrar",
      waitingText: `Lista para registrar · ${daysSince} días`,
      actionLabel: "Generar hoja",
      actionDisabled: true,
      priority: getPriority(daysSince),
      daysSince,
      additionalBlockers: [],
    });
  }

  if (isNoResp) {
    blockers.push({
      type: "no-response",
      label: "Enviada sin respuesta",
      waitingText: `Enviada · sin respuesta ${noResponseDays} días`,
      actionLabel: "Revisar registro",
      actionDisabled: false,
      priority: "high",
      daysSince: noResponseDays,
      additionalBlockers: [],
    });
  }

  if (isWorkMissingIsrc(work)) {
    blockers.push({
      type: "missing-isrc",
      label: "Falta ISRC",
      waitingText: `Falta ISRC · ${daysSince} días`,
      actionLabel: "Agregar ISRC",
      actionDisabled: false,
      priority: getPriority(daysSince),
      daysSince,
      additionalBlockers: [],
    });
  }

  const missingIdentifiers = isWorkMissingIswc(work) || !work.bmiWorkId || !work.mlcSongCode;
  if (missingIdentifiers) {
    const parts: string[] = [];
    if (isWorkMissingIswc(work)) parts.push("ISWC");
    if (!work.bmiWorkId) parts.push("BMI Work ID");
    if (!work.mlcSongCode) parts.push("MLC Song Code");
    blockers.push({
      type: "missing-identifiers",
      label: "Falta identificadores",
      waitingText: `Falta ${parts.join(" y ")} · ${daysSince} días`,
      actionLabel: "Registrar identificador",
      actionDisabled: false,
      priority: getPriority(daysSince),
      daysSince,
      additionalBlockers: [],
    });
  }

  if (blockers.length === 0) {
    return {
      type: "missing-isrc" as BlockerType,
      label: "Al día",
      waitingText: "Todo al día",
      actionLabel: "",
      actionDisabled: true,
      priority: "low" as const,
      daysSince: 0,
      additionalBlockers: [],
    };
  }

  blockers.sort((a, b) => BLOCKER_PRIORITY[a.type] - BLOCKER_PRIORITY[b.type]);
  const primary = blockers[0]!;
  const additional = blockers.slice(1).map((b) => b.label);

  return {
    type: primary.type,
    label: primary.label,
    waitingText: primary.waitingText,
    actionLabel: primary.actionLabel,
    actionDisabled: primary.actionDisabled,
    priority: primary.priority,
    daysSince: primary.daysSince,
    additionalBlockers: additional,
  };
}
