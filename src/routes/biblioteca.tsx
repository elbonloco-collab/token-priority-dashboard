import { createFileRoute } from "@tanstack/react-router";
import { Tile, Big, Label, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({ meta: [
    { title: "Biblioteca — CEREBRO OS" },
    { name: "description", content: "Biblioteca en CEREBRO OS (vista en construcción)." },
    { property: "og:title", content: "Biblioteca — CEREBRO OS" },
    { property: "og:description", content: "Biblioteca en CEREBRO OS." },
  ]}),
  component: () => (
    <div>
      <PageHeader eyebrow="CEREBRO OS" title="Biblioteca" />
      <Tile tone="cream" className="min-h-64">
        <Label>Próximamente</Label>
        <Big className="mt-auto">En construcción</Big>
      </Tile>
    </div>
  ),
});
