import { createFileRoute } from "@tanstack/react-router";
import { Tile, Big, Label, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/finanzas")({
  head: () => ({ meta: [
    { title: "Finanzas — CEREBRO OS" },
    { name: "description", content: "Finanzas en CEREBRO OS (vista en construcción)." },
    { property: "og:title", content: "Finanzas — CEREBRO OS" },
    { property: "og:description", content: "Finanzas en CEREBRO OS." },
  ]}),
  component: () => (
    <div>
      <PageHeader eyebrow="CEREBRO OS" title="Finanzas" />
      <Tile tone="cream" className="min-h-64">
        <Label>Próximamente</Label>
        <Big className="mt-auto">En construcción</Big>
      </Tile>
    </div>
  ),
});
