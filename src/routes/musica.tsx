import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play } from "lucide-react";
import { Tile, Big, Label, PageHeader, Status, Avatars } from "@/components/kit";
import { tracks, releaseChecklist } from "@/lib/demo-data";

export const Route = createFileRoute("/musica")({
  head: () => ({ meta: [
    { title: "Música — CEREBRO OS" },
    { name: "description", content: "Sesiones, versiones de tracks, colaboradores y lanzamientos." },
    { property: "og:title", content: "Música — CEREBRO OS" },
    { property: "og:description", content: "Workspace de música: sesiones, versiones y lanzamientos." },
  ]}),
  component: Musica,
});

function Musica() {
  const [check, setCheck] = useState(releaseChecklist);
  const done = check.filter(c => c.done).length;
  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Música" />
      <div className="grid gap-4 md:grid-cols-3">
        <Tile tone="gradient" className="min-h-64 md:col-span-2">
          <Label className="opacity-90">Proyecto · EP</Label>
          <Big className="mt-auto text-7xl md:text-8xl">Midnight Sessions</Big>
          <div className="mt-3 text-sm opacity-90">4 tracks · lanzamiento 14 nov</div>
        </Tile>
        <Tile tone="orange">
          <Label>Días al lanzamiento</Label>
          <Big className="mt-auto text-9xl">14</Big>
        </Tile>

        <Tile className="md:col-span-2">
          <h2 className="mb-2 text-xl font-medium">Tracks</h2>
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-4 text-xs text-muted-foreground"><span /><span>Título</span><span className="hidden md:block">Colaboradores</span><span>Estado</span></div>
          {tracks.map((t, i) => (
            <div key={t.title} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-4 border-t py-3">
              <button className="grid h-9 w-9 place-items-center rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground" aria-label="Reproducir"><Play className="h-4 w-4" /></button>
              <div><div className="text-lg">{String(i + 1).padStart(2, "0")} {t.title}</div><div className="text-xs text-muted-foreground">{t.version} · {t.bpm} BPM · {t.key} · {t.updated}</div></div>
              <div className="hidden md:block"><Avatars names={t.collab} /></div>
              <Status s={t.status} />
            </div>
          ))}
        </Tile>
        <Tile tone="cream">
          <div className="flex justify-between"><Label>Checklist lanzamiento</Label><span className="text-sm">{done}/{check.length}</span></div>
          <Big className="my-4 text-6xl">{Math.round(done / check.length * 100)}%</Big>
          <ul className="space-y-2">
            {check.map((c, i) => (
              <li key={c.item}>
                <button onClick={() => setCheck(check.map((x, j) => j === i ? { ...x, done: !x.done } : x))}
                  className={`w-full rounded-full px-4 py-2 text-left text-sm ${c.done ? "bg-primary text-primary-foreground" : "border border-primary/40"}`}>
                  {c.item}
                </button>
              </li>
            ))}
          </ul>
        </Tile>

        <Tile tone="lavender"><Label>Versiones totales</Label><Big className="mt-6">{tracks.reduce((s, t) => s + parseInt(t.version.slice(1)), 0)}</Big></Tile>
        <Tile tone="olive"><Label>Colaboradores</Label><Big className="mt-6">{new Set(tracks.flatMap(t => t.collab)).size}</Big></Tile>
        <Tile tone="dark"><Label>Comentarios abiertos</Label><Big className="mt-6">07</Big><div className="mt-2 text-sm text-muted-foreground">«Subir voz en el puente 1:42» — Leo</div></Tile>
      </div>
    </div>
  );
}
