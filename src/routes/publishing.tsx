import { createFileRoute } from "@tanstack/react-router";
import { Tile, Big, Label, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/publishing")({
  head: () => ({ meta: [
    { title: "Publishing — CEREBRO OS" },
    { name: "description", content: "Publishing en CEREBRO OS (vista en construcción)." },
    { property: "og:title", content: "Publishing — CEREBRO OS" },
    { property: "og:description", content: "Publishing en CEREBRO OS." },
  ]}),
  component: () => (
    <div>
      <PageHeader eyebrow="CEREBRO OS" title="Publishing" />
      <Tile tone="cream" className="min-h-64">
        <Label>Próximamente</Label>
        <Big className="mt-auto">En construcción</Big>
      </Tile>
    </div>
  ),
});
