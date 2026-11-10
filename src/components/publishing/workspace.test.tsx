import { act, render, screen, waitFor } from "@testing-library/react";
import { createRouter, RouterContextProvider } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { demoParties, demoWorks } from "@/lib/publishing/demo-data";
import { usePublishingStore } from "@/lib/publishing/store";
import { setNowForTests } from "@/lib/publishing/queries";
import type { SearchParams } from "@/lib/publishing/queries";
import { routeTree } from "@/routeTree.gen";
import { PublishingWorkspace } from "./workspace";

// setNowForTests is exported by the test mock of "@/lib/publishing/queries" below
declare module "@/lib/publishing/queries" {
  export function setNowForTests(now: Date | null): void;
}

vi.mock("@/lib/publishing/queries", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/publishing/queries")>();
  let nowValue: Date | null = null;
  const listeners = new Set<() => void>();

  function setNowForTests(now: Date | null): void {
    nowValue = now;
    for (const listener of listeners) listener();
  }

  return {
    ...actual,
    setNowForTests,
    useNow: () => {
      const [now, setNow] = React.useState<Date | null>(nowValue);
      React.useEffect(() => {
        const onChange = () => setNow(nowValue);
        listeners.add(onChange);
        return () => {
          listeners.delete(onChange);
        };
      }, []);
      return now;
    },
  };
});

const router = createRouter({
  routeTree,
  context: { queryClient: new QueryClient() },
});

const baseSearch: SearchParams = {
  filter: {},
  section: "overview",
  page: 1,
  pageSize: 25,
};

function renderWithRouter(ui: React.ReactNode) {
  return render(<RouterContextProvider router={router}>{ui}</RouterContextProvider>);
}

beforeEach(() => {
  sessionStorage.removeItem("publishing-store");
  sessionStorage.removeItem("publishing-works");
  sessionStorage.removeItem("publishing-parties");
  sessionStorage.removeItem("publishing-audit-log");

  usePublishingStore.setState({
    works: [demoWorks[0]!],
    parties: demoParties,
    _hasHydrated: true,
  });
});

afterEach(() => {
  setNowForTests(null);
  usePublishingStore.setState({ works: [], parties: [], _hasHydrated: false });
});

describe("PublishingWorkspace", () => {
  it("muestra 'Cargando…' mientras now es null y luego la lista sin errores", async () => {
    setNowForTests(null);

    renderWithRouter(<PublishingWorkspace search={baseSearch} />);

    expect(screen.getByText("Cargando…")).toBeInTheDocument();

    await act(async () => {
      setNowForTests(new Date("2026-06-15T12:00:00Z"));
    });

    await waitFor(() => {
      expect(screen.queryByText("Cargando…")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Medianoche/)).toBeInTheDocument();
    });
  });
});
