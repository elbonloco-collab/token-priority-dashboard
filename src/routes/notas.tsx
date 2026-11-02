import { createFileRoute } from "@tanstack/react-router";
import { Tile, Big, Label, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/notas")({
  head: () => ({ meta: [
    { title: "Notas — CEREBRO OS" },
    { name: "description", content: "Notas en CEREBRO OS (vista en construcción)." },
    { property: "og:title", content: "Notas — CEREBRO OS" },
    { property: "og:description", content: "Notas en CEREBRO OS." },
  ]}),
  component: () => (
    <div>
      <PageHeader eyebrow="CEREBRO OS" title="Notas" />
      <Tile tone="cream" className="min-h-64">
        <Label>Próximamente</Label>
        <Big className="mt-auto">En construcción</Big>
      </Tile>
    </div>
  ),
});
