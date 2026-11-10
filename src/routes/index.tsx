import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus } from "lucide-react";
import { Tile, Label, Status } from "@/components/kit";
import { agenda, tasks, finances, tracks } from "@/lib/demo-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hoy — CEREBRO OS" },
      {
        name: "description",
        content: "Tu centro de orientación diaria: agenda, prioridades, entregas y Donna.",
      },
      { property: "og:title", content: "Hoy — CEREBRO OS" },
      {
        property: "og:description",
        content: "Centro de orientación diaria del super workspace CEREBRO OS.",
      },
    ],
  }),
  component: Hoy,
});

function Hoy() {
  const pending = tasks.filter((t) => t.status !== "Listo");
  return (
    <div className="grid grid-cols-1 gap-3 items-stretch lg:grid-cols-12">
      <Tile tone="orange" className="lg:col-span-6">
        <div className="flex flex-col justify-between h-full">
          <div className="flex justify-between">
            <Label>Sábado · 31 oct</Label>
            <span className="text-sm">+3 entregas</span>
          </div>
          <div className="mt-auto">
            <Label className="opacity-90">Buenos días, Bismarck</Label>
            <div className="display-num text-5xl">Hoy</div>
          </div>
        </div>
      </Tile>
      <Tile tone="soft" className="lg:col-span-6">
        <div className="flex flex-col justify-between h-full">
          <div className="flex justify-between">
            <Label>Próximo</Label>
            <span className="rounded-lg bg-blue px-2 text-xs text-foreground">
              +{agenda.length - 1}
            </span>
          </div>
          <div className="mt-auto">
            <div className="display-num text-4xl">{agenda[1]?.time}</div>
            <div className="mt-1 text-sm">{agenda[1]?.title}</div>
          </div>
        </div>
      </Tile>

      <Tile tone="dark" className="lg:col-span-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Prioridades</h2>
          <Link to="/productividad" className="text-xs text-muted-foreground hover:text-primary">
            Ver todo
          </Link>
        </div>
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
      <Tile tone="blue" className="lg:col-span-4">
        <div className="h-full flex flex-col items-center justify-center gap-2">
          <Label className="text-xs">Contadores</Label>
          <div className="grid grid-cols-2 gap-3">
            {[pending.length, tracks.length, 12].map((n, i) => (
              <div
                key={i}
                className="size-14 rounded-full bg-foreground/15 display-num text-xl place-items-center"
              >
                {n}
              </div>
            ))}
            <button className="size-14 rounded-full bg-foreground/40">
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Tile>

      <Tile tone="mint" className="lg:col-span-4">
        <div className="flex flex-col gap-2">
          <Label>Ingresos del mes</Label>
          <div className="display-num text-4xl">+{finances.growth}%</div>
          <Link to="/finanzas" className="mt-1 text-sm underline">
            Abrir Finanzas
          </Link>
        </div>
      </Tile>
      <Tile tone="dark" className="lg:col-span-4">
        <div className="flex flex-col gap-2">
          <Label>Agenda</Label>
          <ul className="mt-1 space-y-1.5">
            {agenda.map((a) => (
              <li key={a.time} className="flex gap-3 text-sm">
                <span className="w-12 font-mono text-primary">{a.time}</span>
                <span className="flex-1 truncate">{a.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </Tile>
      <Tile tone="gradient" className="lg:col-span-4">
        <div className="flex flex-col gap-2">
          <Label className="opacity-90">Donna sugiere</Label>
          <p className="text-sm leading-snug">
            Completar metadatos de «Medianoche» desbloquea la subida del martes.
          </p>
          <Link
            to="/musica"
            className="mt-1 inline-flex w-fit rounded-full border border-current px-3 py-1 text-sm"
          >
            Ir a Música
          </Link>
        </div>
      </Tile>
    </div>
  );
}
