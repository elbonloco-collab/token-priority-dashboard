import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tile, Big, Label, PageHeader, Pill, Status } from "@/components/kit";
import { clients, posts, assets, tasks } from "@/lib/demo-data";

export const Route = createFileRoute("/agencia")({
  head: () => ({ meta: [
    { title: "Agencia — CEREBRO OS" },
    { name: "description", content: "Clientes, campañas, calendario editorial y biblioteca de assets de la agencia." },
    { property: "og:title", content: "Agencia — CEREBRO OS" },
    { property: "og:description", content: "Workspace de agencia: campañas, calendario y assets." },
  ]}),
  component: Agencia,
});

const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const tone: Record<string, string> = { orange: "bg-primary text-primary-foreground", lavender: "bg-lavender text-ink", blue: "bg-blue", mint: "bg-mint text-ink", olive: "bg-olive text-ink", cream: "bg-cream text-primary", gradient: "bg-brand-gradient", dark: "bg-secondary" };

function Agencia() {
  const [view, setView] = useState<"resumen" | "calendario" | "assets">("resumen");
  const [col, setCol] = useState("Todas");
  const cols = ["Todas", ...new Set(assets.map((a) => a.collection))];
  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Agencia" actions={<>
        <Pill active={view === "resumen"} onClick={() => setView("resumen")}>Resumen</Pill>
        <Pill active={view === "calendario"} onClick={() => setView("calendario")}>Calendario editorial</Pill>
        <Pill active={view === "assets"} onClick={() => setView("assets")}>Assets</Pill>
      </>} />

      {view === "resumen" && (
        <div className="grid gap-4 md:grid-cols-4">
          <Tile tone="orange"><Label>Clientes activos</Label><Big className="mt-6">{String(clients.filter(c => c.status === "Activo").length).padStart(3, "0")}</Big></Tile>
          <Tile tone="soft"><Label>Campañas</Label><Big className="mt-6">{clients.reduce((s, c) => s + c.campaigns, 0)}</Big></Tile>
          <Tile tone="cream"><Label>Posts semana</Label><Big className="mt-6">{posts.length}</Big></Tile>
          <Tile tone="dark"><Label>MRR</Label><Big className="mt-6 text-5xl md:text-6xl">${(clients.reduce((s, c) => s + c.mrr, 0) / 1000).toFixed(1)}k</Big></Tile>
          <Tile className="md:col-span-3">
            <h2 className="mb-3 text-xl font-medium">Clientes</h2>
            {clients.map((c) => (
              <div key={c.name} className="flex items-center gap-4 border-t py-3">
                <span className="flex-1 text-lg">{c.name}</span>
                <span className="text-sm text-muted-foreground">{c.campaigns} campañas</span>
                <div className="h-1.5 w-32 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${c.health}%` }} /></div>
                <span className="w-20 text-right text-sm">{c.status}</span>
              </div>
            ))}
          </Tile>
          <Tile tone="dark">
            <h2 className="mb-3 text-xl font-medium">Actividad</h2>
            {tasks.filter(t => t.space === "Agencia" || t.space === "Clientes").map(t => (
              <div key={t.id} className="border-t py-2 text-sm"><div>{t.title}</div><div className="mt-1 flex justify-between text-xs text-muted-foreground">{t.due}<Status s={t.status} /></div></div>
            ))}
          </Tile>
        </div>
      )}

      {view === "calendario" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
          {days.map((d, i) => (
            <div key={d} className="min-h-72 rounded-3xl bg-card p-3">
              <div className="mb-3 flex items-baseline justify-between"><span className="text-sm text-muted-foreground">{d}</span><span className="display-num text-3xl">{3 + i}</span></div>
              {posts.filter(p => p.day === i).map(p => (
                <div key={p.title} className={`mb-2 rounded-2xl p-3 ${tone[p.tone]}`}>
                  <div className="text-xs opacity-80">{p.time} · {p.channel}</div>
                  <div className="mt-1 font-medium">{p.title}</div>
                  <div className="mt-2 text-xs">{p.status}</div>
                </div>
              ))}
              <button className="w-full rounded-full border border-dashed py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">+ Añadir</button>
            </div>
          ))}
        </div>
      )}

      {view === "assets" && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">{cols.map(c => <Pill key={c} active={col === c} onClick={() => setCol(c)}>{c}</Pill>)}</div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {assets.filter(a => col === "Todas" || a.collection === col).map(a => (
              <div key={a.name} className="rounded-3xl bg-card p-3">
                <div className={`grid aspect-square place-items-center rounded-2xl ${tone[a.tone]}`}><span className="display-num text-5xl">{a.type}</span></div>
                <div className="mt-3 font-medium">{a.name}</div><div className="text-xs text-muted-foreground">{a.collection}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
