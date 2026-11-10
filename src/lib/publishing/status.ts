import type { PublishingWork, WorkStatus } from "./types";
import { validateReadyToRegister } from "./validation";

export function deriveWorkStatus(work: PublishingWork): WorkStatus {
  if (work.status === "needs_correction") return "needs_correction";
  const hasIsrc = work.recordings.some((recording) => Boolean(recording.isrc));
  const bmiRegistered = work.registrations.some(
    (registration) => registration.society === "BMI" && registration.status === "registered",
  );
  const mlcRegistered = work.registrations.some(
    (registration) => registration.society === "MLC" && registration.status === "registered",
  );
  if (bmiRegistered && mlcRegistered && work.iswc && work.mlcSongCode) return "verified";
  if (hasIsrc && (!work.iswc || !work.mlcSongCode)) return "iswc_pending";
  if (hasIsrc) return "released";
  if (
    work.registrations.some((registration) =>
      ["submitted", "processing", "registered"].includes(registration.status),
    )
  )
    return "submitted";
  if (work.splitAgreement?.status === "signed") return "splits_signed";
  if (work.writers.length || work.publishers.length) return "splits_pending";
  return "draft";
}

export function canTransitionWork(from: WorkStatus, to: WorkStatus, work: PublishingWork): boolean {
  const allowed: Record<WorkStatus, WorkStatus[]> = {
    draft: ["splits_pending"],
    splits_pending: ["draft", "splits_signed"],
    splits_signed: ["splits_pending", "ready_to_register"],
    ready_to_register: ["splits_signed", "submitted"],
    submitted: ["needs_correction", "released", "iswc_pending", "verified"],
    released: ["iswc_pending", "verified", "needs_correction"],
    iswc_pending: ["verified", "needs_correction"],
    verified: ["needs_correction"],
    needs_correction: ["splits_pending", "ready_to_register", "submitted"],
  };
  if (!allowed[from].includes(to)) return false;
  if (
    to === "ready_to_register" &&
    validateReadyToRegister(work).some((issue) => issue.severity === "error")
  )
    return false;
  return true;
}