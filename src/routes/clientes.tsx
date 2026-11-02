import { createFileRoute } from "@tanstack/react-router";
import { Tile, Big, Label, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [
    { title: "Clientes — CEREBRO OS" },
    { name: "description", content: "Clientes en CEREBRO OS (vista en construcción)." },
    { property: "og:title", content: "Clientes — CEREBRO OS" },
    { property: "og:description", content: "Clientes en CEREBRO OS." },
  ]}),
  component: () => (
    <div>
      <PageHeader eyebrow="CEREBRO OS" title="Clientes" />
      <Tile tone="cream" className="min-h-64">
        <Label>Próximamente</Label>
        <Big className="mt-auto">En construcción</Big>
      </Tile>
    </div>
  ),
});
