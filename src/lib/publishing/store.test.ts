import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePublishingStore } from "./store";
import type { PublishingWork, Party, Recording, Registration, SplitAgreement } from "./types";
import { makeId } from "./queries";

function makeWork(overrides: Partial<PublishingWork> = {}): PublishingWork {
  const now = new Date().toISOString();
  return {
    id: "work-1",
    title: "Test Song",
    alternateTitles: [],
    language: "Español",
    durationSeconds: 180,
    versionNote: "",
    isDerivative: false,
    status: "draft",
    iswc: null,
    bmiWorkId: null,
    mlcSongCode: null,
    internalCode: "CRB-2026-001",
    hasContract: false,
    sampleFlag: false,
    sampleNotes: "",
    controlledSharePercent: 100,
    notes: "",
    writers: [],
    publishers: [],
    recordings: [],
    registrations: [],
    splitAgreement: {
      id: "split-1",
      workId: "work-1",
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
    ...overrides,
  };
}

function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    id: "party-1",
    type: "writer",
    legalName: "John Doe",
    stageName: "JD",
    ipi: "123456789",
    pro: "BMI",
    proMemberNumber: "123",
    email: "john@example.com",
    phone: "",
    notes: "",
    isOwnEntity: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

function makeRecording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: "rec-1",
    workId: "work-1",
    releaseId: null,
    title: "Test Song",
    versionTitle: "",
    artistPartyId: null,
    isrc: null,
    durationSeconds: 180,
    releaseDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

function makeRegistration(overrides: Partial<Registration> = {}): Registration {
  return {
    id: "reg-1",
    workId: "work-1",
    society: "BMI",
    status: "ready",
    submittedAt: null,
    completedAt: null,
    referenceId: null,
    method: "manual",
    notes: "",
    ...overrides,
  };
}

function makeSplit(overrides: Partial<SplitAgreement> = {}): SplitAgreement {
  return {
    id: "split-1",
    workId: "work-1",
    status: "draft",
    signedAt: null,
    documentUrl: null,
    version: 1,
    notes: "",
    confirmations: [],
    ...overrides,
  };
}

describe("publishing store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
    localStorage.clear();
    sessionStorage.clear();
    usePublishingStore.setState({
      works: [],
      parties: [],
      auditLog: [],
    });
  });

  describe("editar obra", () => {
    it("creates audit entry when upserting work", () => {
      const work = makeWork({ id: "work-1", title: "Original Title" });
      usePublishingStore.getState().upsertWork(work);

      const state = usePublishingStore.getState();
      expect(state.works).toHaveLength(1);
      const firstWork = state.works[0];
      expect(firstWork).toBeDefined();
      expect(firstWork!.title).toBe("Original Title");

      const audit = state.getAuditLog("work-1");
      expect(audit.length).toBe(1);
      const firstAudit = audit[0];
      expect(firstAudit).toBeDefined();
      expect(firstAudit!.entityType).toBe("work");
      expect(firstAudit!.field).toBe("created");
    });

    it("creates audit entries for changed fields when updating work", () => {
      const work = makeWork({ id: "work-1", title: "Original Title", language: "Español" });
      usePublishingStore.getState().upsertWork(work);

      vi.advanceTimersByTime(1000);
      usePublishingStore.getState().upsertWork({
        ...work,
        title: "Updated Title",
        language: "Inglés",
      });

      const state = usePublishingStore.getState();
      const updatedWork = state.works[0];
      expect(updatedWork).toBeDefined();
      expect(updatedWork!.title).toBe("Updated Title");
      expect(updatedWork!.language).toBe("Inglés");

      const audit = state.getAuditLog("work-1");
      expect(audit.length).toBeGreaterThanOrEqual(3);

      const titleChange = audit.find((a) => a.field === "title");
      const langChange = audit.find((a) => a.field === "language");
      expect(titleChange).toBeDefined();
      expect(langChange).toBeDefined();
      expect(titleChange!.oldValue).toBe('"Original Title"');
      expect(titleChange!.newValue).toBe('"Updated Title"');
      expect(langChange!.oldValue).toBe('"Español"');
      expect(langChange!.newValue).toBe('"Inglés"');
    });

    it("updates party and creates audit", () => {
      const party = makeParty({ id: "party-1", legalName: "Original Name" });
      usePublishingStore.getState().upsertParty(party);

      vi.advanceTimersByTime(1000);
      usePublishingStore.getState().upsertParty({
        ...party,
        legalName: "Updated Name",
      });

      const state = usePublishingStore.getState();
      const updatedParty = state.parties[0];
      expect(updatedParty).toBeDefined();
      expect(updatedParty!.legalName).toBe("Updated Name");

      const audit = state.getAuditLog("party-1");
      const nameChange = audit.find((a) => a.field === "legalName");
      expect(nameChange?.oldValue).toBe('"Original Name"');
      expect(nameChange?.newValue).toBe('"Updated Name"');
    });
  });

  describe("deshacer eliminación", () => {
    it("deletes work and creates audit entry", () => {
      const work = makeWork({ id: "work-1" });
      usePublishingStore.getState().upsertWork(work);

      const { undone, work: deletedWork } = usePublishingStore.getState().deleteWork("work-1");
      expect(undone).toBe(false);
      expect(deletedWork.id).toBe("work-1");

      const state = usePublishingStore.getState();
      expect(state.works).toHaveLength(0);

      const audit = state.getAuditLog("work-1");
      const deleteAudit = audit.find((a) => a.field === "deleted");
      expect(deleteAudit).toBeDefined();
      expect(deleteAudit?.newValue).toBeNull();
    });

    it("restores work on undo", () => {
      const work = makeWork({ id: "work-1", title: "Test Work" });
      usePublishingStore.getState().upsertWork(work);

      const { undone, work: deletedWork } = usePublishingStore.getState().deleteWork("work-1");
      expect(undone).toBe(false);

      usePublishingStore.getState().restoreWork(deletedWork);

      const state = usePublishingStore.getState();
      expect(state.works).toHaveLength(1);
      const restoredWork = state.works[0];
      expect(restoredWork).toBeDefined();
      expect(restoredWork!.title).toBe("Test Work");
      expect(restoredWork!.deletedAt).toBeNull();

      const audit = state.getAuditLog("work-1");
      const restoreAudit = audit.find((a) => a.field === "restored");
      expect(restoreAudit).toBeDefined();
      expect(restoreAudit?.source).toBe("undo");
    });
  });

  describe("historial de cambios", () => {
    it("returns audit log for entity ordered by date desc", () => {
      const work = makeWork({ id: "work-1" });
      usePublishingStore.getState().upsertWork(work);

      vi.advanceTimersByTime(1000);
      usePublishingStore.getState().upsertWork({ ...work, title: "Title 2" });

      vi.advanceTimersByTime(1000);
      usePublishingStore.getState().upsertWork({ ...work, title: "Title 3" });

      const audit = usePublishingStore.getState().getAuditLog("work-1");
      expect(audit.length).toBeGreaterThanOrEqual(3);
      const titleChanges = audit.filter((a) => a.field === "title");
      expect(titleChanges.length).toBe(2);
      const firstTitleChange = titleChanges[0];
      const secondTitleChange = titleChanges[1];
      expect(firstTitleChange).toBeDefined();
      expect(secondTitleChange).toBeDefined();
      expect(firstTitleChange!.newValue).toBe('"Title 3"');
      expect(secondTitleChange!.newValue).toBe('"Title 2"');
      expect(audit.find((a) => a.field === "created")).toBeDefined();
    });

    it("records recording changes in audit", () => {
      const work = makeWork({ id: "work-1", recordings: [] });
      usePublishingStore.getState().upsertWork(work);

      const recording = makeRecording({ id: "rec-1", isrc: "USRC12345678" });
      usePublishingStore.getState().addRecording("work-1", recording);

      vi.advanceTimersByTime(1000);
      usePublishingStore.getState().updateRecording("work-1", {
        ...recording,
        isrc: "USRC87654321",
      });

      const audit = usePublishingStore.getState().getAuditLog("rec-1");
      expect(audit.length).toBe(2);
      const firstAudit = audit[0];
      expect(firstAudit).toBeDefined();
      expect(firstAudit!.field).toBe("isrc");
      expect(firstAudit!.newValue).toBe('"USRC87654321"');
    });

    it("records registration changes in audit", () => {
      const work = makeWork({ id: "work-1", registrations: [] });
      usePublishingStore.getState().upsertWork(work);

      const registration = makeRegistration({ id: "reg-1", status: "ready" });
      usePublishingStore.getState().addRegistration("work-1", registration);

      vi.advanceTimersByTime(1000);
      usePublishingStore.getState().updateRegistration("work-1", {
        ...registration,
        status: "submitted",
      });

      const audit = usePublishingStore.getState().getAuditLog("reg-1");
      expect(audit.length).toBe(2);
      const firstRegAudit = audit[0];
      expect(firstRegAudit).toBeDefined();
      expect(firstRegAudit!.field).toBe("status");
      expect(firstRegAudit!.newValue).toBe('"submitted"');
    });

    it("records split changes in audit", () => {
      const work = makeWork({ id: "work-1", splitAgreement: makeSplit({ status: "draft" }) });
      usePublishingStore.getState().upsertWork(work);

      vi.advanceTimersByTime(1000);
      usePublishingStore.getState().upsertSplit("work-1", {
        ...makeSplit({ id: "split-1", status: "signed" }),
      });

      const audit = usePublishingStore.getState().getAuditLog("work-1");
      const splitAudit = audit.find((a) => a.entityType === "split" && a.field === "status");
      expect(splitAudit).toBeDefined();
      expect(splitAudit?.newValue).toBe('"signed"');
    });
  });

  describe("sessionStorage persistence", () => {
    function readPersisted(): { works: PublishingWork[]; parties: Party[]; auditLog: unknown[] } {
      const raw = sessionStorage.getItem("publishing-store");
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!) as {
        state: { works: PublishingWork[]; parties: Party[]; auditLog: unknown[] };
      };
      return parsed.state;
    }

    it("persists works to sessionStorage", () => {
      const work = makeWork({ id: "work-1" });
      usePublishingStore.getState().upsertWork(work);

      const persisted = readPersisted();
      expect(persisted.works).toHaveLength(1);
      expect(persisted.works[0]?.id).toBe("work-1");
    });

    it("persists parties to sessionStorage", () => {
      const party = makeParty({ id: "party-1" });
      usePublishingStore.getState().upsertParty(party);

      const persisted = readPersisted();
      expect(persisted.parties).toHaveLength(1);
      expect(persisted.parties[0]?.id).toBe("party-1");
    });

    it("persists audit log to sessionStorage", () => {
      usePublishingStore.getState().upsertWork(makeWork({ id: "work-1" }));

      expect(readPersisted().auditLog.length).toBeGreaterThanOrEqual(1);
    });

    it("no expone banderas de hidratación: el store está listo desde el primer render", () => {
      const state = usePublishingStore.getState() as unknown as Record<string, unknown>;
      expect(state["_hasHydrated"]).toBeUndefined();
    });
  });
});
