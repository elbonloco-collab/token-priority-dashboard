import { createFileRoute } from "@tanstack/react-router";
import { Tile, Big, Label, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/marca")({
  head: () => ({ meta: [
    { title: "Marca personal — CEREBRO OS" },
    { name: "description", content: "Marca personal en CEREBRO OS (vista en construcción)." },
    { property: "og:title", content: "Marca personal — CEREBRO OS" },
    { property: "og:description", content: "Marca personal en CEREBRO OS." },
  ]}),
  component: () => (
    <div>
      <PageHeader eyebrow="CEREBRO OS" title="Marca personal" />
      <Tile tone="cream" className="min-h-64">
        <Label>Próximamente</Label>
        <Big className="mt-auto">En construcción</Big>
      </Tile>
    </div>
  ),
});
