import { createFileRoute } from "@tanstack/react-router";
import { Tile, Big, Label, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/investigacion")({
  head: () => ({ meta: [
    { title: "Investigación — CEREBRO OS" },
    { name: "description", content: "Investigación en CEREBRO OS (vista en construcción)." },
    { property: "og:title", content: "Investigación — CEREBRO OS" },
    { property: "og:description", content: "Investigación en CEREBRO OS." },
  ]}),
  component: () => (
    <div>
      <PageHeader eyebrow="CEREBRO OS" title="Investigación" />
      <Tile tone="cream" className="min-h-64">
        <Label>Próximamente</Label>
        <Big className="mt-auto">En construcción</Big>
      </Tile>
    </div>
  ),
});
