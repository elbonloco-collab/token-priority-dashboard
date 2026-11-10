import type { PublishingWork, ValidationIssue } from "./types";

const SPLIT_TOLERANCE = 0.06;

export function normalizeIpi(value: string): string {
  return value.trim();
}

export function validateIpi(value: string | null | undefined): ValidationIssue[] {
  const ipi = normalizeIpi(value ?? "");
  if (!ipi) return [{ code: "ipi_missing", message: "Falta IPI.", severity: "warning" }];
  return /^\d{9}$/.test(ipi)
    ? []
    : [
        {
          code: "ipi_invalid",
          message: "El IPI debe tener exactamente 9 dígitos.",
          severity: "error",
        },
      ];
}

export function normalizeIsrc(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function formatIsrc(value: string): string {
  const normalized = normalizeIsrc(value);
  if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(normalized)) return normalized;
  return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5, 7)}-${normalized.slice(7)}`;
}

export function validateIsrc(value: string | null | undefined): ValidationIssue[] {
  const isrc = normalizeIsrc(value ?? "");
  if (!isrc) return [];
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc)
    ? []
    : [
        {
          code: "isrc_invalid",
          message:
            "El ISRC debe tener 12 caracteres: 2 letras, 3 caracteres alfanuméricos y 7 dígitos.",
          severity: "error",
        },
      ];
}

export function normalizeIswc(value: string): string {
  return value.replace(/[\s.-]/g, "").toUpperCase();
}

export function formatIswc(value: string): string {
  const normalized = normalizeIswc(value);
  if (!/^T\d{10}$/.test(normalized)) return normalized;
  return `T-${normalized.slice(1, 4)}.${normalized.slice(4, 7)}.${normalized.slice(7, 10)}-${normalized.slice(10)}`;
}

export function validateIswc(value: string | null | undefined): ValidationIssue[] {
  const iswc = normalizeIswc(value ?? "");
  if (!iswc) return [];
  if (!/^T\d{10}$/.test(iswc)) {
    return [
      {
        code: "iswc_invalid_format",
        message: "El ISWC debe tener el formato T + 9 dígitos + dígito de control.",
        severity: "error",
      },
    ];
  }
  const digits = iswc.slice(1, 10).split("").map(Number);
  const sum = 1 + digits.reduce((total, digit, index) => total + (index + 1) * digit, 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return Number(iswc[10]) === checkDigit
    ? []
    : [
        {
          code: "iswc_invalid_check_digit",
          message: "El dígito de control del ISWC no es válido.",
          severity: "error",
        },
      ];
}

export function validateUniqueIsrc(
  value: string | null | undefined,
  otherRecordings: Array<{ id: string; isrc: string | null }>,
  currentRecordingId?: string,
): ValidationIssue[] {
  const isrc = normalizeIsrc(value ?? "");
  if (!isrc || validateIsrc(isrc).length) return [];
  const duplicate = otherRecordings.some(
    (recording) =>
      recording.id !== currentRecordingId &&
      recording.isrc &&
      normalizeIsrc(recording.isrc) === isrc,
  );
  return duplicate
    ? [
        {
          code: "isrc_duplicate",
          message: "Este ISRC ya está asignado a otra grabación.",
          severity: "error",
        },
      ]
    : [];
}

export function validateSplits(
  work: Pick<PublishingWork, "writers" | "publishers" | "sampleFlag" | "controlledSharePercent">,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const expected = work.sampleFlag ? work.controlledSharePercent : 100;
  const writerTotal = work.writers.reduce((total, writer) => total + writer.writerSharePercent, 0);
  const publisherTotal = work.publishers.reduce(
    (total, publisher) => total + publisher.publisherSharePercent,
    0,
  );
  const shares = [
    ...work.writers.map((writer) => writer.writerSharePercent),
    ...work.publishers.map((publisher) => publisher.publisherSharePercent),
  ];

  if (
    work.sampleFlag &&
    (!Number.isFinite(work.controlledSharePercent) ||
      work.controlledSharePercent <= 0 ||
      work.controlledSharePercent > 100)
  ) {
    issues.push({
      code: "controlled_share_invalid",
      message: "La parte controlada debe ser mayor que 0% y no superar el 100%.",
      severity: "error",
    });
  }
  if (
    shares.some(
      (share) =>
        !Number.isFinite(share) || share < 0 || share > 100 || Number(share.toFixed(4)) !== share,
    )
  ) {
    issues.push({
      code: "split_share_invalid",
      message: "Cada porcentaje debe estar entre 0% y 100% y tener como máximo 4 decimales.",
      severity: "error",
    });
  }
  if (Math.abs(writerTotal - expected) > SPLIT_TOLERANCE) {
    issues.push({
      code: "writer_splits_invalid",
      message: `Los splits de compositores suman ${writerTotal.toFixed(2)}%; deben sumar ${expected.toFixed(2)}%.`,
      severity: "error",
    });
  }
  if (Math.abs(publisherTotal - expected) > SPLIT_TOLERANCE) {
    issues.push({
      code: "publisher_splits_invalid",
      message: `Los splits editoriales suman ${publisherTotal.toFixed(2)}%; deben sumar ${expected.toFixed(2)}%.`,
      severity: "error",
    });
  }
  return issues;
}

export function validateReadyToRegister(work: PublishingWork): ValidationIssue[] {
  const issues = validateSplits(work);
  if (!work.title.trim()) {
    issues.push({
      code: "title_required",
      message: "Agrega el título de la obra.",
      severity: "error",
    });
  }
  if (!work.writers.some((writer) => writer.role !== "arranger")) {
    issues.push({
      code: "writer_required",
      message: "Agrega al menos un compositor.",
      severity: "error",
    });
  }
  if (!work.publishers.some((publisher) => publisher.isOwn)) {
    issues.push({
      code: "own_publisher_missing",
      message: "Asigna tu editorial controlada antes de registrar.",
      severity: "error",
    });
  }
  if (work.sampleFlag && !work.sampleNotes.trim()) {
    issues.push({
      code: "sample_notes_missing",
      message: "Describe el sample o la interpolación.",
      severity: "error",
    });
  }
  return issues;
}

export function hasValidSplits(
  work: Pick<PublishingWork, "writers" | "publishers" | "sampleFlag" | "controlledSharePercent">,
): boolean {
  return validateSplits(work).length === 0;
}
