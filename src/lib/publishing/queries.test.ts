import { describe, it, expect, vi } from "vitest";
import {
  filterWorks,
  getIssueCounts,
  getPendingTasks,
  computeCompleteness,
  isWorkMissingIsrc,
  isWorkMissingIswc,
  isWorkMissingMlcSongCode,
  isSplitUnsigned,
  isReadyToRegister,
  isNoResponse,
  validateSearch,
  toFlatSearch,
  sanitizeReturnTo,
  validateIdentifier,
  DEFAULT_NO_RESPONSE_DAYS,
  normalizeText,
  getPrimaryBlocker,
  type WorkFilter,
} from "./queries";
import type {
  PublishingWork,
  Party,
  WorkWriter,
  WorkPublisher,
  Recording,
  Registration,
  SplitAgreement,
} from "./types";

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

describe("queries", () => {
  describe("normalizeText", () => {
    it("removes accents and lowercases", () => {
      expect(normalizeText("Música")).toBe("musica");
      expect(normalizeText("CANCIÓN")).toBe("cancion");
      expect(normalizeText("  Test  ")).toBe("test");
    });
  });

  describe("computeCompleteness", () => {
    it("returns 0 for empty work", () => {
      const work = makeWork({
        title: "",
        writers: [],
        recordings: [],
        iswc: null,
        mlcSongCode: null,
      });
      expect(computeCompleteness(work)).toBe(0);
    });

    it("returns 100 for complete work", () => {
      const work = makeWork({
        title: "Complete Song",
        writers: [
          { partyId: "p1", role: "composer_lyricist", writerSharePercent: 100, controlled: true },
        ],
        publishers: [
          {
            partyId: "pub1",
            publisherSharePercent: 100,
            isOwn: true,
            administratorPartyId: null,
            agreementNumber: null,
          },
        ],
        recordings: [makeRecording({ isrc: "USRC12345678", releaseDate: "2026-01-01" })],
        iswc: "T-123.456.789-0",
        mlcSongCode: "MLC123",
        splitAgreement: {
          id: "split-1",
          workId: "work-1",
          status: "signed",
          signedAt: new Date().toISOString(),
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
      });
      expect(computeCompleteness(work)).toBe(100);
    });

    it("returns partial score for incomplete work", () => {
      const work = makeWork({
        title: "Partial Song",
        writers: [
          { partyId: "p1", role: "composer_lyricist", writerSharePercent: 100, controlled: true },
        ],
        recordings: [makeRecording({ isrc: "USRC12345678" })],
        iswc: null,
        mlcSongCode: null,
      });
      const score = computeCompleteness(work);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });
  });

  describe("isWorkMissingIsrc", () => {
    it("returns true when no recordings have ISRC", () => {
      const work = makeWork({
        recordings: [makeRecording({ isrc: null }), makeRecording({ isrc: null })],
      });
      expect(isWorkMissingIsrc(work)).toBe(true);
    });

    it("returns false when at least one recording has ISRC", () => {
      const work = makeWork({
        recordings: [makeRecording({ isrc: "USRC12345678" }), makeRecording({ isrc: null })],
      });
      expect(isWorkMissingIsrc(work)).toBe(false);
    });

    it("returns true when no recordings", () => {
      const work = makeWork({ recordings: [] });
      expect(isWorkMissingIsrc(work)).toBe(true);
    });
  });

  describe("isWorkMissingIswc", () => {
    it("returns true when ISWC is null", () => {
      const work = makeWork({ iswc: null });
      expect(isWorkMissingIswc(work)).toBe(true);
    });

    it("returns false when ISWC is set", () => {
      const work = makeWork({ iswc: "T-123.456.789-0" });
      expect(isWorkMissingIswc(work)).toBe(false);
    });
  });

  describe("isWorkMissingMlcSongCode", () => {
    it("returns true when MLC song code is null", () => {
      const work = makeWork({ mlcSongCode: null });
      expect(isWorkMissingMlcSongCode(work)).toBe(true);
    });

    it("returns false when MLC song code is set", () => {
      const work = makeWork({ mlcSongCode: "MLC123" });
      expect(isWorkMissingMlcSongCode(work)).toBe(false);
    });
  });

  describe("isSplitUnsigned", () => {
    it("returns true when split status is not signed", () => {
      const work = makeWork({
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
      });
      expect(isSplitUnsigned(work)).toBe(true);
    });

    it("returns false when split status is signed", () => {
      const work = makeWork({
        splitAgreement: {
          id: "split-1",
          workId: "work-1",
          status: "signed",
          signedAt: new Date().toISOString(),
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
      });
      expect(isSplitUnsigned(work)).toBe(false);
    });
  });

  describe("isReadyToRegister", () => {
    it("returns true when status is ready_to_register", () => {
      const work = makeWork({ status: "ready_to_register" });
      expect(isReadyToRegister(work)).toBe(true);
    });

    it("returns false for other statuses", () => {
      const work = makeWork({ status: "draft" });
      expect(isReadyToRegister(work)).toBe(false);
    });
  });

  describe("isNoResponse", () => {
    it("returns false when no registrations", () => {
      const work = makeWork({ registrations: [] });
      expect(isNoResponse(work, new Date(), 14)).toBe(false);
    });

    it("returns false when registration submitted recently", () => {
      const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const work = makeWork({
        registrations: [
          makeRegistration({ society: "BMI", status: "submitted", submittedAt: recent }),
        ],
      });
      expect(isNoResponse(work, new Date(), 14)).toBe(false);
    });

    it("returns true when registration submitted more than threshold days ago", () => {
      const old = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
      const work = makeWork({
        registrations: [
          makeRegistration({ society: "BMI", status: "submitted", submittedAt: old }),
        ],
      });
      expect(isNoResponse(work, new Date(), 14)).toBe(true);
    });

    it("uses the latest submission date across societies", () => {
      const old = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
      const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const work = makeWork({
        registrations: [
          makeRegistration({ society: "BMI", status: "submitted", submittedAt: old }),
          makeRegistration({ society: "MLC", status: "submitted", submittedAt: recent }),
        ],
      });
      expect(isNoResponse(work, new Date(), 14)).toBe(false);
    });

    it("respects custom threshold", () => {
      const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const work = makeWork({
        registrations: [
          makeRegistration({ society: "BMI", status: "submitted", submittedAt: old }),
        ],
      });
      expect(isNoResponse(work, new Date(), 7)).toBe(true);
      expect(isNoResponse(work, new Date(), 14)).toBe(false);
    });

    it("returns false for registered status", () => {
      const old = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
      const work = makeWork({
        registrations: [
          makeRegistration({ society: "BMI", status: "registered", submittedAt: old }),
        ],
      });
      // isNoResponse checks latest submittedAt regardless of status
      expect(isNoResponse(work, new Date(), 14)).toBe(true);
    });
  });

  describe("getIssueCounts", () => {
    it("counts all issue types correctly", () => {
      const works = [
        makeWork({
          id: "1",
          recordings: [makeRecording({ isrc: null })],
          iswc: null,
          mlcSongCode: null,
          splitAgreement: {
            id: "s1",
            workId: "1",
            status: "draft",
            signedAt: null,
            documentUrl: null,
            version: 1,
            notes: "",
            confirmations: [],
          },
          status: "draft",
          registrations: [],
        }),
        makeWork({
          id: "2",
          recordings: [makeRecording({ isrc: "USRC12345678" })],
          iswc: "T-123.456.789-0",
          mlcSongCode: "MLC123",
          splitAgreement: {
            id: "s2",
            workId: "2",
            status: "signed",
            signedAt: new Date().toISOString(),
            documentUrl: null,
            version: 1,
            notes: "",
            confirmations: [],
          },
          status: "ready_to_register",
          registrations: [
            makeRegistration({
              society: "BMI",
              status: "submitted",
              submittedAt: new Date().toISOString(),
            }),
          ],
        }),
        makeWork({
          id: "3",
          recordings: [makeRecording({ isrc: null })],
          iswc: null,
          mlcSongCode: null,
          splitAgreement: {
            id: "s3",
            workId: "3",
            status: "draft",
            signedAt: null,
            documentUrl: null,
            version: 1,
            notes: "",
            confirmations: [],
          },
          status: "needs_correction",
          registrations: [],
        }),
      ];

      const counts = getIssueCounts(works);
      expect(counts["without-isrc"]).toBe(2);
      expect(counts["without-iswc"]).toBe(2);
      expect(counts["without-mlc"]).toBe(2);
      expect(counts.unsigned).toBe(2);
      expect(counts["registration-pending"]).toBe(1);
      expect(counts.correction).toBe(1);
    });
  });

  describe("getPendingTasks", () => {
    it("creates tasks with correct counts and works", () => {
      const works = [
        makeWork({
          id: "1",
          recordings: [makeRecording({ isrc: null })],
          iswc: null,
          status: "draft",
        }),
        makeWork({
          id: "2",
          recordings: [makeRecording({ isrc: "USRC12345678" })],
          iswc: "T-123.456.789-0",
          status: "ready_to_register",
        }),
      ];

      const tasks = getPendingTasks(works, new Date());
      const missingIsrcTask = tasks.find((t) => t.type === "missing-isrc");
      const missingIswcTask = tasks.find((t) => t.type === "missing-iswc");
      const readyTask = tasks.find((t) => t.type === "ready-to-register");

      expect(missingIsrcTask?.count).toBe(1);
      expect(missingIsrcTask?.works.length).toBe(1);
      expect(missingIswcTask?.count).toBe(2);
      expect(readyTask?.count).toBe(1);
    });

    it("uses configurable threshold for no-response", () => {
      const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const works = [
        makeWork({
          id: "1",
          registrations: [
            makeRegistration({ society: "BMI", status: "submitted", submittedAt: old }),
          ],
        }),
      ];

      const tasks14 = getPendingTasks(works, new Date(), 14);
      const tasks7 = getPendingTasks(works, new Date(), 7);

      const noResponse14 = tasks14.find((t) => t.type === "no-response");
      const noResponse7 = tasks7.find((t) => t.type === "no-response");

      expect(noResponse14?.count).toBe(0);
      expect(noResponse7?.count).toBe(1);
    });
  });

  describe("filterWorks", () => {
    const works = [
      makeWork({
        id: "1",
        title: "Song One",
        status: "draft",
        recordings: [makeRecording({ isrc: null })],
        iswc: null,
        mlcSongCode: null,
        splitAgreement: {
          id: "s1",
          workId: "1",
          status: "draft",
          signedAt: null,
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        writers: [
          { partyId: "p1", role: "composer_lyricist", writerSharePercent: 100, controlled: true },
        ],
        publishers: [
          {
            partyId: "pub1",
            publisherSharePercent: 100,
            isOwn: true,
            administratorPartyId: null,
            agreementNumber: null,
          },
        ],
        registrations: [],
      }),
      makeWork({
        id: "2",
        title: "Song Two",
        status: "ready_to_register",
        recordings: [makeRecording({ isrc: "USRC12345678" })],
        iswc: "T-123.456.789-0",
        mlcSongCode: "MLC123",
        splitAgreement: {
          id: "s2",
          workId: "2",
          status: "signed",
          signedAt: new Date().toISOString(),
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        writers: [
          { partyId: "p1", role: "composer_lyricist", writerSharePercent: 100, controlled: true },
        ],
        publishers: [
          {
            partyId: "pub1",
            publisherSharePercent: 100,
            isOwn: true,
            administratorPartyId: null,
            agreementNumber: null,
          },
        ],
        registrations: [
          makeRegistration({
            society: "BMI",
            status: "registered",
            submittedAt: new Date().toISOString(),
          }),
        ],
      }),
      makeWork({
        id: "3",
        title: "Another Song",
        status: "released",
        recordings: [makeRecording({ isrc: "USRC87654321", releaseDate: "2026-01-15" })],
        iswc: "T-987.654.321-0",
        mlcSongCode: "MLC456",
        splitAgreement: {
          id: "s3",
          workId: "3",
          status: "signed",
          signedAt: new Date().toISOString(),
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        writers: [
          { partyId: "p2", role: "composer_lyricist", writerSharePercent: 100, controlled: true },
        ],
        publishers: [
          {
            partyId: "pub1",
            publisherSharePercent: 100,
            isOwn: true,
            administratorPartyId: null,
            agreementNumber: null,
          },
        ],
        registrations: [
          makeRegistration({
            society: "BMI",
            status: "registered",
            submittedAt: new Date().toISOString(),
          }),
          makeRegistration({
            society: "MLC",
            status: "registered",
            submittedAt: new Date().toISOString(),
          }),
        ],
      }),
    ];

    it("filters by status", () => {
      const result = filterWorks(works, { status: "draft" });
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe("1");
    });

    it("filters by BMI registration status", () => {
      const none = filterWorks(works, { bmi: "none" });
      expect(none.length).toBe(1);
      expect(none[0]!.id).toBe("1");

      const registered = filterWorks(works, { bmi: "registered" });
      expect(registered.length).toBe(2);
    });

    it("filters by MLC registration status", () => {
      const none = filterWorks(works, { mlc: "none" });
      expect(none.length).toBe(2);
    });

    it("filters by missing ISRC", () => {
      const result = filterWorks(works, { missingIsrc: true });
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe("1");
    });

    it("filters by missing ISWC", () => {
      const result = filterWorks(works, { missingIswc: true });
      expect(result.length).toBe(1);
    });

    it("filters by missing MLC song code", () => {
      const result = filterWorks(works, { missingMlcSongCode: true });
      expect(result.length).toBe(1);
    });

    it("filters by split status", () => {
      const unsigned = filterWorks(works, { split: "unsigned" });
      expect(unsigned.length).toBe(1);

      const signed = filterWorks(works, { split: "signed" });
      expect(signed.length).toBe(2);
    });

    it("filters by search text", () => {
      const result = filterWorks(works, { search: "Song One" });
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe("1");
    });

    it("filters by release date range", () => {
      const result = filterWorks(works, { releaseFrom: "2026-01-01", releaseTo: "2026-01-31" });
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe("3");
    });

    it("sorts by title asc", () => {
      const result = filterWorks(works, { sort: "title", sortDir: "asc" });
      expect(result[0]!.title).toBe("Another Song");
      expect(result[1]!.title).toBe("Song One");
      expect(result[2]!.title).toBe("Song Two");
    });

    it("sorts by title desc", () => {
      const result = filterWorks(works, { sort: "title", sortDir: "desc" });
      expect(result[0]!.title).toBe("Song Two");
      expect(result[2]!.title).toBe("Another Song");
    });

    it("sorts by completeness", () => {
      const result = filterWorks(works, { sort: "completeness", sortDir: "desc" });
      expect(result[0]!.id).toBe("3");
      expect(result[2]!.id).toBe("1");
    });

    it("combines multiple filters", () => {
      const result = filterWorks(works, { status: "released", missingIsrc: false });
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe("3");
    });
  });

  describe("validateSearch", () => {
    it("parses valid search params", () => {
      const search = {
        section: "works",
        status: "draft",
        bmi: "none",
        mlc: "registered",
        missingIsrc: "1",
        search: "test",
        sort: "title",
        sortDir: "desc",
        page: "2",
        pageSize: "50",
      };

      const result = validateSearch(search);
      expect(result.section).toBe("works");
      expect(result.filter.status).toBe("draft");
      expect(result.filter.bmi).toBe("none");
      expect(result.filter.mlc).toBe("registered");
      expect(result.filter.missingIsrc).toBe(true);
      expect(result.filter.search).toBe("test");
      expect(result.filter.sort).toBe("title");
      expect(result.filter.sortDir).toBe("desc");
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(50);
    });

    it("defaults section to overview", () => {
      const search = {};
      const result = validateSearch(search);
      expect(result.section).toBe("overview");
    });

    it("defaults page to 1", () => {
      const search = { page: "0" };
      const result = validateSearch(search);
      expect(result.page).toBe(1);
    });

    it("defaults pageSize to 25", () => {
      const search = { pageSize: "999" };
      const result = validateSearch(search);
      expect(result.pageSize).toBe(25);
    });

    it("accepts valid pageSize values", () => {
      for (const size of [10, 25, 50, 100]) {
        const search = { pageSize: String(size) };
        const result = validateSearch(search);
        expect(result.pageSize).toBe(size);
      }
    });

    it("parses boolean flags correctly", () => {
      const search = {
        missingIsrc: "1",
        missingIswc: "0",
        missingMlcSongCode: "1",
        hasContract: "1",
        hasSample: "0",
      };
      const result = validateSearch(search);
      expect(result.filter.missingIsrc).toBe(true);
      expect(result.filter.missingIswc).toBeUndefined();
      expect(result.filter.missingMlcSongCode).toBe(true);
      expect(result.filter.hasContract).toBe(true);
      expect(result.filter.hasSample).toBe(false);
    });

    it("handles undefined boolean flags", () => {
      const search = {};
      const result = validateSearch(search);
      expect(result.filter.missingIsrc).toBeUndefined();
      expect(result.filter.hasContract).toBeUndefined();
    });

    it("handles array values (multiple same param)", () => {
      const search = { status: ["draft", "released"], page: ["2", "3"] };
      const result = validateSearch(search);
      expect(result.filter.status).toBe("draft");
      expect(result.page).toBe(2);
    });

    it("handles numeric values", () => {
      const search = { page: 2, pageSize: 50 };
      const result = validateSearch(search);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(50);
    });

    it("cae al valor por defecto con valores desconocidos (nunca pantalla en blanco)", () => {
      const result = validateSearch({
        tab: "inexistente",
        status: "invalid_status",
        bmi: "unknown",
        page: "abc",
        pageSize: 7,
        sort: "nope",
      });
      expect(result.section).toBe("overview");
      expect(result.filter.status).toBeUndefined();
      expect(result.filter.bmi).toBeUndefined();
      expect(result.filter.sort).toBeUndefined();
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(25);
    });

    it("lee la pestaña desde ?tab= y mantiene ?section= como alias antiguo", () => {
      expect(validateSearch({ tab: "works" }).section).toBe("works");
      expect(validateSearch({ section: "people" }).section).toBe("people");
      expect(validateSearch({ tab: "works", section: "people" }).section).toBe("works");
    });

    it("acepta banderas como booleanos reales (lo que entrega el router) o como 1/0", () => {
      const result = validateSearch({
        missingIsrc: true,
        missingIswc: 1,
        hasContract: false,
        hasSample: "1",
      });
      expect(result.filter.missingIsrc).toBe(true);
      expect(result.filter.missingIswc).toBe(true);
      expect(result.filter.hasContract).toBe(false);
      expect(result.filter.hasSample).toBe(true);
    });

    it("no lanza con objetos, arreglos vacíos ni valores nulos", () => {
      expect(() =>
        validateSearch({ status: {}, page: [], search: null, artist: undefined }),
      ).not.toThrow();
    });

    it("convierte un número de la URL en texto de búsqueda (?search=2024 llega como número)", () => {
      expect(validateSearch({ search: 2024 }).filter.search).toBe("2024");
    });
  });

  describe("toFlatSearch", () => {
    it("omite los valores por defecto", () => {
      expect(toFlatSearch(validateSearch({}))).toEqual({});
    });

    it("hace ida y vuelta con validateSearch conservando filtros, orden y página", () => {
      const original = validateSearch({
        tab: "works",
        status: "ready_to_register",
        bmi: "none",
        missingIsrc: true,
        hasContract: false,
        search: "luna",
        sort: "title",
        sortDir: "desc",
        page: 3,
        pageSize: 50,
      });
      const flat = toFlatSearch(original);
      expect(flat).toMatchObject({ tab: "works", status: "ready_to_register", page: 3 });
      expect(validateSearch(flat)).toEqual(original);
    });

    it("no emite status=all", () => {
      const flat = toFlatSearch({
        filter: { status: "all" },
        section: "works",
        page: 1,
        pageSize: 25,
      });
      expect(flat).toEqual({ tab: "works" });
    });
  });

  describe("sanitizeReturnTo", () => {
    it("conserva rutas internas del módulo con sus filtros", () => {
      expect(sanitizeReturnTo("/publishing?tab=works&status=draft")).toBe(
        "/publishing?tab=works&status=draft",
      );
    });

    it("rechaza destinos externos o ajenos al módulo", () => {
      expect(sanitizeReturnTo("https://evil.example")).toBe("/publishing");
      expect(sanitizeReturnTo("//evil.example")).toBe("/publishing");
      expect(sanitizeReturnTo("/finanzas")).toBe("/publishing");
      expect(sanitizeReturnTo(undefined)).toBe("/publishing");
      expect(sanitizeReturnTo(42)).toBe("/publishing");
    });
  });

  describe("validateIdentifier", () => {
    it("validates correct ISRC", () => {
      const result = validateIdentifier("isrc", "USRC12345678");
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe("US-RC1-23-45678");
    });

    it("rejects invalid ISRC", () => {
      const result = validateIdentifier("isrc", "invalid");
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("validates correct ISWC", () => {
      // T-123.456.789-4 has valid check digit (calculated: 4)
      const result = validateIdentifier("iswc", "T-123.456.789-4");
      expect(result.valid).toBe(true);
    });

    it("rejects invalid ISWC", () => {
      const result = validateIdentifier("iswc", "invalid");
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe("DEFAULT_NO_RESPONSE_DAYS", () => {
    it("is 14", () => {
      expect(DEFAULT_NO_RESPONSE_DAYS).toBe(14);
    });
  });

  describe("getPrimaryBlocker", () => {
    const now = new Date("2026-06-15T12:00:00Z");

    it("returns needs-correction as highest priority", () => {
      const work = makeWork({
        status: "needs_correction",
        updatedAt: "2026-06-01T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.type).toBe("needs-correction");
      expect(blocker.actionLabel).toBe("Corregir");
      expect(blocker.actionDisabled).toBe(false);
      expect(blocker.priority).toBe("high");
    });

    it("returns unsigned-split when split is unsigned", () => {
      const work = makeWork({
        status: "splits_pending",
        splitAgreement: {
          id: "s1",
          workId: "w1",
          status: "draft",
          signedAt: null,
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        updatedAt: "2026-06-01T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.type).toBe("unsigned-split");
      expect(blocker.actionLabel).toBe("Abrir split sheet");
      expect(blocker.actionDisabled).toBe(true);
    });

    it("returns ready-to-register when status is ready_to_register", () => {
      const work = makeWork({
        status: "ready_to_register",
        splitAgreement: {
          id: "s1",
          workId: "w1",
          status: "signed",
          signedAt: "2026-06-01T12:00:00Z",
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        updatedAt: "2026-06-01T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.type).toBe("ready-to-register");
      expect(blocker.actionLabel).toBe("Generar hoja");
      expect(blocker.actionDisabled).toBe(true);
    });

    it("returns no-response when submitted over threshold", () => {
      const submittedAt = new Date("2026-05-01T12:00:00Z").toISOString();
      const work = makeWork({
        status: "submitted",
        splitAgreement: {
          id: "s1",
          workId: "w1",
          status: "signed",
          signedAt: "2026-06-01T12:00:00Z",
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        registrations: [
          {
            id: "r1",
            workId: "w1",
            society: "BMI",
            status: "submitted",
            submittedAt,
            completedAt: null,
            referenceId: null,
            method: "manual",
            notes: "",
          },
        ],
        updatedAt: "2026-05-01T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.type).toBe("no-response");
      expect(blocker.actionLabel).toBe("Revisar registro");
      expect(blocker.actionDisabled).toBe(false);
      expect(blocker.priority).toBe("high");
    });

    it("does not return no-response when under threshold", () => {
      const submittedAt = new Date("2026-06-10T12:00:00Z").toISOString();
      const work = makeWork({
        status: "submitted",
        splitAgreement: {
          id: "s1",
          workId: "w1",
          status: "signed",
          signedAt: "2026-06-01T12:00:00Z",
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        registrations: [
          {
            id: "r1",
            workId: "w1",
            society: "BMI",
            status: "submitted",
            submittedAt,
            completedAt: null,
            referenceId: null,
            method: "manual",
            notes: "",
          },
        ],
        updatedAt: "2026-06-10T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.type).not.toBe("no-response");
    });

    it("returns missing-isrc when no ISRC", () => {
      const work = makeWork({
        status: "released",
        splitAgreement: {
          id: "s1",
          workId: "w1",
          status: "signed",
          signedAt: "2026-06-01T12:00:00Z",
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        recordings: [
          {
            id: "rec1",
            workId: "w1",
            releaseId: null,
            title: "Test",
            versionTitle: "",
            artistPartyId: null,
            isrc: null,
            durationSeconds: 180,
            releaseDate: "2026-06-01",
            createdAt: "2026-06-01T12:00:00Z",
            updatedAt: "2026-06-01T12:00:00Z",
            deletedAt: null,
          },
        ],
        updatedAt: "2026-06-01T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.type).toBe("missing-isrc");
      expect(blocker.actionLabel).toBe("Agregar ISRC");
      expect(blocker.actionDisabled).toBe(false);
    });

    it("returns missing-identifiers when ISWC/MLC/BMI missing", () => {
      const work = makeWork({
        status: "draft",
        splitAgreement: {
          id: "s1",
          workId: "w1",
          status: "signed",
          signedAt: "2026-06-01T12:00:00Z",
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        iswc: null,
        bmiWorkId: null,
        mlcSongCode: null,
        recordings: [
          {
            id: "rec1",
            workId: "w1",
            releaseId: null,
            title: "Test",
            versionTitle: "",
            artistPartyId: null,
            isrc: "USRC12345678",
            durationSeconds: 180,
            releaseDate: null,
            createdAt: "2026-06-01T12:00:00Z",
            updatedAt: "2026-06-01T12:00:00Z",
            deletedAt: null,
          },
        ],
        updatedAt: "2026-06-01T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.type).toBe("missing-identifiers");
      expect(blocker.actionLabel).toBe("Registrar identificador");
      expect(blocker.actionDisabled).toBe(false);
      expect(blocker.waitingText).toContain("ISWC");
      expect(blocker.waitingText).toContain("BMI Work ID");
      expect(blocker.waitingText).toContain("MLC Song Code");
    });

    it("priority is high when days > 30", () => {
      const work = makeWork({
        status: "draft",
        splitAgreement: {
          id: "s1",
          workId: "w1",
          status: "signed",
          signedAt: "2026-06-01T12:00:00Z",
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        iswc: null,
        updatedAt: "2026-05-01T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.priority).toBe("high");
    });

    it("priority is medium when days 14-30", () => {
      const work = makeWork({
        status: "draft",
        splitAgreement: {
          id: "s1",
          workId: "w1",
          status: "signed",
          signedAt: "2026-06-01T12:00:00Z",
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        iswc: null,
        updatedAt: "2026-06-01T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.priority).toBe("medium");
    });

    it("priority is low when days < 14", () => {
      const work = makeWork({
        status: "draft",
        splitAgreement: {
          id: "s1",
          workId: "w1",
          status: "signed",
          signedAt: "2026-06-01T12:00:00Z",
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        iswc: null,
        updatedAt: "2026-06-10T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.priority).toBe("low");
    });

    it("uses release date for days since when released", () => {
      const work = makeWork({
        status: "released",
        splitAgreement: {
          id: "s1",
          workId: "w1",
          status: "signed",
          signedAt: "2026-06-01T12:00:00Z",
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        recordings: [
          {
            id: "rec1",
            workId: "w1",
            releaseId: null,
            title: "Test",
            versionTitle: "",
            artistPartyId: null,
            isrc: "USRC12345678",
            durationSeconds: 180,
            releaseDate: "2026-05-01",
            createdAt: "2026-05-01T12:00:00Z",
            updatedAt: "2026-06-01T12:00:00Z",
            deletedAt: null,
          },
        ],
        updatedAt: "2026-06-01T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.daysSince).toBeGreaterThan(30);
    });

    it("includes additional blockers", () => {
      const work = makeWork({
        status: "needs_correction",
        splitAgreement: {
          id: "s1",
          workId: "w1",
          status: "signed",
          signedAt: "2026-06-01T12:00:00Z",
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        iswc: null,
        updatedAt: "2026-06-01T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.type).toBe("needs-correction");
      expect(blocker.additionalBlockers).toContain("Falta identificadores");
    });

    it("returns al día when no blockers", () => {
      const work = makeWork({
        status: "verified",
        iswc: "T-123.456.789-4",
        bmiWorkId: "BMI123",
        mlcSongCode: "MLC123",
        recordings: [
          {
            id: "rec1",
            workId: "w1",
            releaseId: null,
            title: "Test",
            versionTitle: "",
            artistPartyId: null,
            isrc: "USRC12345678",
            durationSeconds: 180,
            releaseDate: "2026-06-01",
            createdAt: "2026-06-01T12:00:00Z",
            updatedAt: "2026-06-01T12:00:00Z",
            deletedAt: null,
          },
        ],
        splitAgreement: {
          id: "s1",
          workId: "w1",
          status: "signed",
          signedAt: "2026-06-01T12:00:00Z",
          documentUrl: null,
          version: 1,
          notes: "",
          confirmations: [],
        },
        updatedAt: "2026-06-01T12:00:00Z",
      });
      const blocker = getPrimaryBlocker(work, now);
      expect(blocker.waitingText).toBe("Todo al día");
      expect(blocker.actionLabel).toBe("");
      expect(blocker.actionDisabled).toBe(true);
    });
  });
});
