import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { demoParties, demoWorks } from "@/lib/publishing/demo-data";
import { usePublishingStore } from "@/lib/publishing/store";
import { routeTree } from "@/routeTree.gen";

async function renderAt(url: string) {
  const history = createMemoryHistory({ initialEntries: [url] });
  const router = createRouter({
    routeTree,
    history,
    context: { queryClient: new QueryClient() },
  });
  await router.load();
  // El root usa <html> como shell: se monta sobre `document`, igual que en el navegador.
  render(<RouterProvider router={router} />, { container: document, baseElement: document.body });
  return router;
}

function currentUrl(router: Awaited<ReturnType<typeof renderAt>>): string {
  return router.history.location.href;
}

beforeEach(() => {
  sessionStorage.clear();
  usePublishingStore.setState({ works: demoWorks, parties: demoParties, auditLog: [] });
});

afterEach(() => {
  cleanup();
});

describe("Publishing: rutas, pestañas y navegación", () => {
  it("dibuja la lista dentro del layout con un solo aviso de demostración", async () => {
    await renderAt("/publishing");

    expect(
      await screen.findByRole("heading", { name: "Publishing", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Datos de demostración")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Nueva obra/ })).toBeInTheDocument();
  });

  it("responde al clic en las pestañas y refleja ?tab= en la URL", async () => {
    const router = await renderAt("/publishing");
    const worksTab = await screen.findByRole("tab", { name: /Obras/ });

    // Radix Tabs activa con mousedown, igual que un clic real del navegador.
    fireEvent.mouseDown(worksTab, { button: 0, ctrlKey: false });
    fireEvent.click(worksTab);

    await waitFor(() => expect(currentUrl(router)).toContain("tab=works"));
    expect(await screen.findAllByText("Medianoche")).not.toHaveLength(0);

    const pendingTab = screen.getByRole("tab", { name: /Pendientes/ });
    fireEvent.mouseDown(pendingTab, { button: 0, ctrlKey: false });
    fireEvent.click(pendingTab);
    await waitFor(() => expect(currentUrl(router)).not.toContain("tab="));
  });

  it("muestra la prioridad en español (Alta / Media / Baja), nunca High/Medium/Low", async () => {
    await renderAt("/publishing");
    await screen.findByRole("heading", { name: "Publishing", level: 1 });

    expect(screen.queryByText(/^(High|Medium|Low)$/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/^(Alta|Media|Baja)$/).length).toBeGreaterThan(0);
  });

  it("la lista de obras muestra estados en español, nunca códigos crudos", async () => {
    await renderAt("/publishing?tab=works");
    await screen.findAllByText("Medianoche");

    expect(screen.queryByText(/ready_to_register|splits_pending|needs_correction/)).toBeNull();
    expect(screen.queryByText(/^(draft|submitted|processing)$/)).toBeNull();
    expect(screen.getAllByText("Listo para registrar").length).toBeGreaterThan(0);
  });

  it("clic en una fila abre la hoja de obra y Volver conserva los filtros", async () => {
    const router = await renderAt("/publishing?tab=works&status=splits_pending");
    const title = demoWorks.find((w) => w.status === "splits_pending")!.title;

    const row = (await screen.findAllByText(title))[0]!.closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(row!);

    await waitFor(() => expect(currentUrl(router)).toContain("/publishing/obras/"));
    const back = await screen.findByLabelText("Volver");

    fireEvent.click(back);

    await waitFor(() => expect(router.state.location.pathname).toBe("/publishing"));
    expect(router.state.location.search).toMatchObject({ tab: "works", status: "splits_pending" });
  });

  it("recargar (F5) con filtros en la URL conserva pestaña y filtros", async () => {
    const url = "/publishing?tab=works&status=draft&page=1";
    const router = await renderAt(url);

    expect(await screen.findAllByText("Obras")).not.toHaveLength(0);
    expect(currentUrl(router)).toContain("tab=works");
    expect(currentUrl(router)).toContain("status=draft");
  });

  it("valores desconocidos en la URL caen al valor por defecto sin pantalla en blanco", async () => {
    await renderAt("/publishing?tab=zzz&status=nada&page=-4&pageSize=3");

    expect(
      await screen.findByRole("heading", { name: "Publishing", level: 1 }),
    ).toBeInTheDocument();
    const [sectionTab] = screen.getAllByRole("tab", { name: /^Pendientes/ });
    expect(sectionTab).toHaveAttribute("data-state", "active");
  });

  it("la hoja de obra abre por URL directa (sin pasar por la lista)", async () => {
    await renderAt(`/publishing/obras/${demoWorks[0]!.id}`);

    expect(await screen.findByLabelText("Volver")).toBeInTheDocument();
    expect(await screen.findAllByText(demoWorks[0]!.title)).not.toHaveLength(0);
  });
});
