"use client";

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type {
  PublishingWork,
  Party,
  Recording,
  Registration,
  SplitAgreement,
  WorkWriter,
  WorkPublisher,
} from "./types";
import { demoWorks, demoParties } from "./demo-data";
import { makeId } from "./queries";

export interface AuditEntry {
  id: string;
  entityType: "work" | "party" | "recording" | "registration" | "split";
  entityId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  source: "user" | "import" | "undo";
}

type PublishingState = {
  works: PublishingWork[];
  parties: Party[];
  auditLog: AuditEntry[];

  getWork: (id: string) => PublishingWork | undefined;
  getParty: (id: string) => Party | undefined;
  upsertWork: (work: PublishingWork) => void;
  deleteWork: (id: string) => { undone: boolean; work: PublishingWork };
  restoreWork: (work: PublishingWork) => void;
  upsertParty: (party: Party) => void;
  deleteParty: (id: string) => void;
  addRecording: (workId: string, recording: Recording) => void;
  updateRecording: (workId: string, recording: Recording) => void;
  deleteRecording: (workId: string, recordingId: string) => void;
  addRegistration: (workId: string, registration: Registration) => void;
  updateRegistration: (workId: string, registration: Registration) => void;
  upsertSplit: (workId: string, split: SplitAgreement) => void;
  getAuditLog: (entityId: string) => AuditEntry[];
};

function createAuditEntry(
  entityType: AuditEntry["entityType"],
  entityId: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  source: AuditEntry["source"] = "user",
): AuditEntry {
  return {
    id: makeId(),
    entityType,
    entityId,
    field,
    oldValue,
    newValue,
    changedAt: new Date().toISOString(),
    source,
  };
}

function diffObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
): Array<{ field: string; oldValue: string | null; newValue: string | null }> {
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
  for (const key of allKeys) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key,
        oldValue: oldVal === undefined || oldVal === null ? null : JSON.stringify(oldVal),
        newValue: newVal === undefined || newVal === null ? null : JSON.stringify(newVal),
      });
    }
  }
  return changes;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const usePublishingStore = create<PublishingState>()(
  persist(
    (set, get) => ({
      works: demoWorks,
      parties: demoParties,
      auditLog: [],
      getWork: (id) => get().works.find((w) => w.id === id),
      getParty: (id) => get().parties.find((p) => p.id === id),

      upsertWork: (work) =>
        set((state) => {
          const existing = state.works.find((w) => w.id === work.id);
          const newAudit = existing
            ? diffObjects(
                existing as unknown as Record<string, unknown>,
                work as unknown as Record<string, unknown>,
              ).map((c) => createAuditEntry("work", work.id, c.field, c.oldValue, c.newValue))
            : [createAuditEntry("work", work.id, "created", null, JSON.stringify(work))];
          const works = existing
            ? state.works.map((w) =>
                w.id === work.id ? { ...work, updatedAt: new Date().toISOString() } : w,
              )
            : [{ ...work, updatedAt: new Date().toISOString() }, ...state.works];
          return { works, auditLog: [...newAudit, ...state.auditLog] };
        }),

      deleteWork: (id) => {
        const state = get();
        const work = state.works.find((w) => w.id === id);
        if (!work) return { undone: true, work: {} as PublishingWork };
        const works = state.works.filter((w) => w.id !== id);
        const audit = [createAuditEntry("work", id, "deleted", JSON.stringify(work), null)];
        set({ works, auditLog: [...audit, ...state.auditLog] });
        return { undone: false, work };
      },

      restoreWork: (work) =>
        set((state) => {
          const works = [
            ...state.works,
            { ...work, deletedAt: null, updatedAt: new Date().toISOString() },
          ];
          const audit = [
            createAuditEntry("work", work.id, "restored", null, JSON.stringify(work), "undo"),
          ];
          return { works, auditLog: [...audit, ...state.auditLog] };
        }),

      upsertParty: (party) =>
        set((state) => {
          const existing = state.parties.find((p) => p.id === party.id);
          const newAudit = existing
            ? diffObjects(
                existing as unknown as Record<string, unknown>,
                party as unknown as Record<string, unknown>,
              ).map((c) => createAuditEntry("party", party.id, c.field, c.oldValue, c.newValue))
            : [createAuditEntry("party", party.id, "created", null, JSON.stringify(party))];
          const parties = existing
            ? state.parties.map((p) =>
                p.id === party.id ? { ...party, updatedAt: new Date().toISOString() } : p,
              )
            : [{ ...party, updatedAt: new Date().toISOString() }, ...state.parties];
          return { parties, auditLog: [...newAudit, ...state.auditLog] };
        }),

      deleteParty: (id) =>
        set((state) => {
          const parties = state.parties.filter((p) => p.id !== id);
          const audit = [createAuditEntry("party", id, "deleted", null, null)];
          return { parties, auditLog: [...audit, ...state.auditLog] };
        }),

      addRecording: (workId, recording) =>
        set((state) => {
          const work = state.works.find((w) => w.id === workId);
          if (!work) return state;
          const recordings = [
            ...work.recordings,
            { ...recording, id: recording.id || makeId(), workId },
          ];
          const updatedWork = { ...work, recordings, updatedAt: new Date().toISOString() };
          const works = state.works.map((w) => (w.id === workId ? updatedWork : w));
          const audit = [
            createAuditEntry("recording", recording.id, "created", null, JSON.stringify(recording)),
          ];
          return { works, auditLog: [...audit, ...state.auditLog] };
        }),

      updateRecording: (workId, recording) =>
        set((state) => {
          const work = state.works.find((w) => w.id === workId);
          if (!work) return state;
          const existingRec = work.recordings.find((r) => r.id === recording.id);
          const recordings = work.recordings.map((r) =>
            r.id === recording.id ? { ...recording, updatedAt: new Date().toISOString() } : r,
          );
          const updatedWork = { ...work, recordings, updatedAt: new Date().toISOString() };
          const works = state.works.map((w) => (w.id === workId ? updatedWork : w));
          const audit = existingRec
            ? diffObjects(
                existingRec as unknown as Record<string, unknown>,
                recording as unknown as Record<string, unknown>,
              ).map((c) =>
                createAuditEntry("recording", recording.id, c.field, c.oldValue, c.newValue),
              )
            : [];
          return { works, auditLog: [...audit, ...state.auditLog] };
        }),

      deleteRecording: (workId, recordingId) =>
        set((state) => {
          const work = state.works.find((w) => w.id === workId);
          if (!work) return state;
          const recording = work.recordings.find((r) => r.id === recordingId);
          if (!recording) return state;
          const recordings = work.recordings.filter((r) => r.id !== recordingId);
          const updatedWork = { ...work, recordings, updatedAt: new Date().toISOString() };
          const works = state.works.map((w) => (w.id === workId ? updatedWork : w));
          const audit = [
            createAuditEntry("recording", recordingId, "deleted", JSON.stringify(recording), null),
          ];
          return { works, auditLog: [...audit, ...state.auditLog] };
        }),

      addRegistration: (workId, registration) =>
        set((state) => {
          const work = state.works.find((w) => w.id === workId);
          if (!work) return state;
          const registrations = [
            ...work.registrations,
            { ...registration, id: registration.id || makeId(), workId },
          ];
          const updatedWork = { ...work, registrations, updatedAt: new Date().toISOString() };
          const works = state.works.map((w) => (w.id === workId ? updatedWork : w));
          const audit = [
            createAuditEntry(
              "registration",
              registration.id,
              "created",
              null,
              JSON.stringify(registration),
            ),
          ];
          return { works, auditLog: [...audit, ...state.auditLog] };
        }),

      updateRegistration: (workId, registration) =>
        set((state) => {
          const work = state.works.find((w) => w.id === workId);
          if (!work) return state;
          const existingReg = work.registrations.find((r) => r.id === registration.id);
          const registrations = work.registrations.map((r) =>
            r.id === registration.id ? { ...registration, updatedAt: new Date().toISOString() } : r,
          );
          const updatedWork = { ...work, registrations, updatedAt: new Date().toISOString() };
          const works = state.works.map((w) => (w.id === workId ? updatedWork : w));
          const audit = existingReg
            ? diffObjects(
                existingReg as unknown as Record<string, unknown>,
                registration as unknown as Record<string, unknown>,
              ).map((c) =>
                createAuditEntry("registration", registration.id, c.field, c.oldValue, c.newValue),
              )
            : [];
          return { works, auditLog: [...audit, ...state.auditLog] };
        }),

      upsertSplit: (workId, split) =>
        set((state) => {
          const work = state.works.find((w) => w.id === workId);
          if (!work) return state;
          const existingSplit = work.splitAgreement;
          const updatedWork = {
            ...work,
            splitAgreement: split,
            updatedAt: new Date().toISOString(),
          };
          const works = state.works.map((w) => (w.id === workId ? updatedWork : w));
          const audit = existingSplit
            ? diffObjects(
                existingSplit as unknown as Record<string, unknown>,
                split as unknown as Record<string, unknown>,
              ).map((c) => createAuditEntry("split", workId, c.field, c.oldValue, c.newValue))
            : [createAuditEntry("split", workId, "created", null, JSON.stringify(split))];
          return { works, auditLog: [...audit, ...state.auditLog] };
        }),

      getAuditLog: (entityId) =>
        get()
          .auditLog.filter((a) => a.entityId === entityId)
          .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()),
    }),
    {
      name: "publishing-store",
      // El módulo se renderiza solo en cliente (ClientOnly). En el navegador, zustand lee
      // sessionStorage de forma síncrona al crear el store, así que no hay bandera de hidratación.
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : window.sessionStorage,
      ),
      partialize: (state) => ({
        works: state.works,
        parties: state.parties,
        auditLog: state.auditLog,
      }),
    },
  ),
);

export function useWork(id: string): PublishingWork | undefined {
  return usePublishingStore((s) => s.getWork(id));
}

export function useParty(id: string): Party | undefined {
  return usePublishingStore((s) => s.getParty(id));
}

export { usePublishingStore };
