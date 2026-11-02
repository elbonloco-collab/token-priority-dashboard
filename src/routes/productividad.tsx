import { createFileRoute } from "@tanstack/react-router";
import { Tile, Big, Label, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/productividad")({
  head: () => ({ meta: [
    { title: "Productividad — CEREBRO OS" },
    { name: "description", content: "Productividad en CEREBRO OS (vista en construcción)." },
    { property: "og:title", content: "Productividad — CEREBRO OS" },
    { property: "og:description", content: "Productividad en CEREBRO OS." },
  ]}),
  component: () => (
    <div>
      <PageHeader eyebrow="CEREBRO OS" title="Productividad" />
      <Tile tone="cream" className="min-h-64">
        <Label>Próximamente</Label>
        <Big className="mt-auto">En construcción</Big>
      </Tile>
    </div>
  ),
});
