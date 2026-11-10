import { createFileRoute } from "@tanstack/react-router";
import { WorkSheetPage } from "@/components/publishing/WorkSheetPage";

export const Route = createFileRoute("/publishing/obras/$workId")({
  head: () => ({
    meta: [
      { title: "Hoja de Obra — CEREBRO OS" },
      {
        name: "description",
        content: "Detalle completo de una obra musical: datos, splits, grabaciones, registros y historial.",
      },
      { property: "og:title", content: "Hoja de Obra — CEREBRO OS" },
    ],
  }),
  validateSearch: ({ returnTo, section }) => ({
    returnTo: returnTo ? String(returnTo) : "/publishing",
    section: section ? String(section) : "summary",
  }),
  component: WorkSheetPage,
});