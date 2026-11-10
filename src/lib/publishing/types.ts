export type PartyType = "writer" | "publisher" | "artist";
export type Pro = "BMI" | "ASCAP" | "SESAC" | "GMR" | "SOCAN" | "SGAE" | "PRS" | "OTHER" | "NONE";
export type WriterRole = "composer" | "lyricist" | "composer_lyricist" | "arranger";
export type WorkStatus =
  | "draft"
  | "splits_pending"
  | "splits_signed"
  | "ready_to_register"
  | "submitted"
  | "released"
  | "iswc_pending"
  | "verified"
  | "needs_correction";
export type Society = "BMI" | "MLC" | (string & {});
export type RegistrationStatus =
  | "not_started"
  | "ready"
  | "submitted"
  | "processing"
  | "registered"
  | "needs_correction"
  | "rejected";

export interface Party {
  id: string;
  type: PartyType;
  legalName: string;
  stageName: string;
  ipi: string | null;
  pro: Pro;
  proMemberNumber: string | null;
  email: string;
  phone: string;
  notes: string;
  isOwnEntity: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkWriter {
  partyId: string;
  role: WriterRole;
  writerSharePercent: number;
  controlled: boolean;
}

export interface WorkPublisher {
  partyId: string;
  publisherSharePercent: number;
  isOwn: boolean;
  administratorPartyId: string | null;
  agreementNumber: string | null;
}

export interface Release {
  id: string;
  title: string;
  upc: string | null;
  label: string;
  distributor: string;
  releaseDate: string | null;
  type: "single" | "EP" | "album";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Recording {
  id: string;
  workId: string;
  releaseId: string | null;
  title: string;
  versionTitle: string;
  artistPartyId: string | null;
  isrc: string | null;
  durationSeconds: number | null;
  releaseDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Registration {
  id: string;
  workId: string;
  society: Society;
  status: RegistrationStatus;
  submittedAt: string | null;
  completedAt: string | null;
  referenceId: string | null;
  method: "manual" | "agent" | "bulk" | "cwr";
  notes: string;
}

export interface SplitAgreement {
  id: string;
  workId: string;
  status: "draft" | "sent" | "signed" | "declined";
  signedAt: string | null;
  documentUrl: string | null;
  version: number;
  notes: string;
  confirmations: Array<{
    partyId: string;
    confirmedAt: string | null;
    confirmationMethod: string | null;
  }>;
}

export interface PublishingWork {
  id: string;
  title: string;
  alternateTitles: string[];
  language: string;
  durationSeconds: number | null;
  versionNote: string;
  isDerivative: boolean;
  status: WorkStatus;
  iswc: string | null;
  bmiWorkId: string | null;
  mlcSongCode: string | null;
  internalCode: string;
  hasContract: boolean;
  sampleFlag: boolean;
  sampleNotes: string;
  controlledSharePercent: number;
  notes: string;
  writers: WorkWriter[];
  publishers: WorkPublisher[];
  recordings: Recording[];
  registrations: Registration[];
  splitAgreement: SplitAgreement | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AuditLogEntry {
  id: string;
  entityType: "party" | "work" | "recording" | "registration";
  entityId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  source: "user" | "import" | "agent_import";
}

export type Section = "overview" | "works" | "people" | "recordings" | "imports";

export type ValidationIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
};
