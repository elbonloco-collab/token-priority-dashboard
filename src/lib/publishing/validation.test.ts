import { describe, expect, it } from "vitest";

import { demoWorks } from "./demo-data";
import { canTransitionWork, deriveWorkStatus } from "./status";
import {
  formatIsrc,
  formatIswc,
  normalizeIsrc,
  validateIpi,
  validateIsrc,
  validateIswc,
  validateReadyToRegister,
  validateSplits,
} from "./validation";

describe("publishing identifier validation", () => {
  it("accepts only nine-digit IPIs while allowing a missing IPI as a warning", () => {
    expect(validateIpi("123456789")).toEqual([]);
    expect(validateIpi("12345")[0]?.severity).toBe("error");
    expect(validateIpi("")[0]?.message).toContain("Falta IPI");
  });

  it("normalizes and formats ISRC values", () => {
    expect(normalizeIsrc("us-abc-26-00001")).toBe("USABC2600001");
    expect(validateIsrc("us-abc-26-00001")).toEqual([]);
    expect(formatIsrc("USABC2600001")).toBe("US-ABC-26-00001");
    expect(validateIsrc("USABC260001")).toHaveLength(1);
  });

  it("validates the ISWC check digit and formats valid values", () => {
    expect(validateIswc("T-034.524.680-1")).toEqual([]);
    expect(formatIswc("T0345246801")).toBe("T-034.524.680-1");
    expect(validateIswc("T-034.524.680-2")[0]?.code).toBe("iswc_invalid_check_digit");
    expect(validateIswc("T123")).toHaveLength(1);
  });
});

describe("publishing split and status rules", () => {
  it("accepts splits within the ±0.06% tolerance", () => {
    const work = demoWorks[1]!;
    expect(validateSplits(work)).toEqual([]);
    expect(
      validateSplits({
        ...work,
        writers: [{ ...work.writers[0]!, writerSharePercent: 99.95 }],
      }),
    ).toEqual([]);
    expect(
      validateSplits({
        ...work,
        writers: [{ ...work.writers[0]!, writerSharePercent: 99.93 }],
      })[0]?.code,
    ).toBe("writer_splits_invalid");
    expect(
      validateSplits({
        ...work,
        writers: [{ ...work.writers[0]!, writerSharePercent: -1 }],
      }).some((issue) => issue.code === "split_share_invalid"),
    ).toBe(true);
  });

  it("calculates sample splits against only the controlled share", () => {
    const sampleWork = demoWorks[2]!;
    expect(validateSplits(sampleWork)).toEqual([]);
    expect(
      validateSplits({
        ...sampleWork,
        writers: sampleWork.writers.map((writer) => ({ ...writer, writerSharePercent: 50 })),
      })[0]?.code,
    ).toBe("writer_splits_invalid");
  });

  it("blocks ready-to-register without required metadata and valid splits", () => {
    expect(validateReadyToRegister(demoWorks[1]!)).toEqual([]);
    expect(
      validateReadyToRegister(demoWorks[3]!).some((issue) => issue.code === "title_required"),
    ).toBe(false);
    expect(canTransitionWork("splits_signed", "ready_to_register", demoWorks[1]!)).toBe(true);
    expect(canTransitionWork("splits_signed", "ready_to_register", demoWorks[3]!)).toBe(false);
  });

  it("derives launched and verified states from registrations and recordings", () => {
    const work = demoWorks[0]!;
    expect(deriveWorkStatus(work)).toBe("iswc_pending");
    expect(
      deriveWorkStatus({
        ...work,
        iswc: "T0345246801",
        mlcSongCode: "MLC-001",
        registrations: work.registrations.map((registration) => ({
          ...registration,
          status: "registered",
        })),
      }),
    ).toBe("verified");
  });
});
