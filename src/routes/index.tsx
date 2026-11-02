import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus } from "lucide-react";
import { Tile, Big, Label, Status } from "@/components/kit";
import { agenda, tasks, finances, tracks } from "@/lib/demo-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hoy — CEREBRO OS" },
      { name: "description", content: "Tu centro de orientación diaria: agenda, prioridades, entregas y Donna." },
      { property: "og:title", content: "Hoy — CEREBRO OS" },
      { property: "og:description", content: "Centro de orientación diaria del super workspace CEREBRO OS." },
    ],
  }),
  component: Hoy,
});

function Hoy() {
  const pending = tasks.filter((t) => t.status !== "Listo");
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
      <Tile tone="orange" className="min-h-64 md:col-span-3">
        <div className="flex justify-between"><Label>Sábado · 31 oct</Label><span className="text-sm">+3 entregas</span></div>
        <div className="mt-auto"><Label className="opacity-90">Buenos días, Bismarck</Label><Big className="text-7xl md:text-8xl">Hoy</Big></div>
      </Tile>
      <Tile tone="soft" className="md:col-span-3">
        <div className="flex justify-between"><Label>Próximo</Label><span className="rounded-lg bg-blue px-2 text-sm text-foreground">+{agenda.length - 1}</span></div>
        <Big className="mt-auto text-8xl md:text-9xl">{agenda[1]?.time}</Big>
        <div className="mt-2 text-lg">{agenda[1]?.title}</div>
      </Tile>

      <Tile tone="dark" className="md:col-span-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-medium">Prioridades</h2><Link to="/productividad" className="text-sm text-muted-foreground hover:text-primary">Ver todo</Link></div>
        <ul className="divide-y divide-border">
          {pending.slice(0, 5).map((t) => (
            <li key={t.id}>
              <Link to={t.link ?? "/"} className="group flex items-center gap-3 py-3">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{t.space}</span>
                <span className="flex-1 truncate">{t.title}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{t.due}</span>
                <Status s={t.status} />
                <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      </Tile>
      <Tile tone="blue" className="md:col-span-2">
        <Label>Contadores</Label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[pending.length, tracks.length, 12].map((n, i) => (
            <div key={i} className="grid aspect-square place-items-center rounded-full bg-foreground/15 display-num text-5xl">{n}</div>
          ))}
          <button className="grid aspect-square place-items-center rounded-full bg-foreground/40"><Plus className="h-10 w-10" /></button>
        </div>
      </Tile>

      <Tile tone="mint" className="md:col-span-2">
        <Label>Ingresos del mes</Label>
        <Big className="mt-auto">+{finances.growth}%</Big>
        <Link to="/finanzas" className="mt-3 text-sm underline">Abrir Finanzas</Link>
      </Tile>
      <Tile tone="dark" className="md:col-span-2">
        <Label>Agenda</Label>
        <ul className="mt-3 space-y-2">
          {agenda.map((a) => (
            <li key={a.time} className="flex gap-3 text-sm"><span className="w-12 font-mono text-primary">{a.time}</span><span className="flex-1">{a.title}</span></li>
          ))}
        </ul>
      </Tile>
      <Tile tone="gradient" className="md:col-span-2">
        <Label className="opacity-90">Donna sugiere</Label>
        <p className="mt-3 text-lg leading-snug">Completar metadatos de «Medianoche» desbloquea la subida del martes.</p>
        <Link to="/musica" className="mt-auto inline-flex w-fit rounded-full border border-current px-4 py-1.5 text-sm">Ir a Música</Link>
      </Tile>
    </div>
  );
}
