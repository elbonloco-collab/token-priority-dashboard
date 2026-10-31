import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Sun, StickyNote, ListChecks, Briefcase, Music2, User, Users, Send, Search, Wallet, Library, Plus, Sparkles, X, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const groups = [
  { label: "Personal", items: [
    { to: "/", label: "Hoy", icon: Sun },
    { to: "/notas", label: "Notas", icon: StickyNote },
    { to: "/productividad", label: "Productividad", icon: ListChecks },
  ]},
  { label: "Espacios", items: [
    { to: "/agencia", label: "Agencia", icon: Briefcase },
    { to: "/musica", label: "Música", icon: Music2 },
    { to: "/marca", label: "Marca personal", icon: User },
    { to: "/clientes", label: "Clientes", icon: Users },
  ]},
  { label: "Apps", items: [
    { to: "/publishing", label: "Publishing", icon: Send },
    { to: "/investigacion", label: "Investigación", icon: Search },
    { to: "/finanzas", label: "Finanzas", icon: Wallet },
    { to: "/biblioteca", label: "Biblioteca", icon: Library },
  ]},
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [donna, setDonna] = useState(false);
  const [nav, setNav] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-60 border-r bg-background p-4 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
        nav ? "translate-x-0" : "-translate-x-full",
      )}>
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground font-bold">C</span>
          <span className="text-lg font-semibold tracking-tight">CEREBRO OS</span>
        </Link>
        {groups.map((g) => (
          <div key={g.label} className="mb-6">
            <div className="mb-2 px-2 text-xs uppercase tracking-widest text-muted-foreground">{g.label}</div>
            {g.items.map((i) => {
              const active = path === i.to;
              return (
                <Link key={i.to} to={i.to} onClick={() => setNav(false)}
                  className={cn("flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                  <i.icon className="h-4 w-4" />{i.label}
                </Link>
              );
            })}
          </div>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <button className="md:hidden" onClick={() => setNav(!nav)} aria-label="Menú"><Menu className="h-5 w-5" /></button>
          <div className="flex flex-1 items-center gap-2 rounded-full border px-4 py-2 text-sm text-muted-foreground md:max-w-md">
            <Search className="h-4 w-4" /> Buscar o ejecutar comando… <kbd className="ml-auto rounded border px-1.5 text-xs">⌘K</kbd>
          </div>
          <span className="hidden rounded-full border border-primary/50 px-3 py-1 text-xs text-primary sm:inline">Datos de demostración</span>
          <button className="flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
            <Plus className="h-4 w-4" /> Crear
          </button>
          <button onClick={() => setDonna(true)} className="flex items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Donna
          </button>
        </header>
        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>

      {donna && <Donna onClose={() => setDonna(false)} />}
    </div>
  );
}

function Donna({ onClose }: { onClose: () => void }) {
  const [msgs, setMsgs] = useState([
    { me: false, t: "Buenos días. Tienes 2 entregas hoy y la subida de «Medianoche» está bloqueada por metadatos. ¿Lo preparo?" },
  ]);
  const [v, setV] = useState("");
  const send = () => {
    if (!v.trim()) return;
    setMsgs((m) => [...m, { me: true, t: v }, { me: false, t: "Entendido (demo). Preparé un borrador y lo dejé en tu bandeja para revisión." }]);
    setV("");
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col border-l bg-popover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-brand-gradient p-5">
          <div><div className="text-sm opacity-80">Asistente</div><div className="display-num text-4xl">Donna</div></div>
          <button onClick={onClose} aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          {["Resumir mi día", "Completar metadatos", "Programar posts", "Crear factura"].map((a) => (
            <button key={a} onClick={() => setV(a)} className="rounded-full border px-3 py-1 text-xs hover:bg-accent">{a}</button>
          ))}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          {msgs.map((m, i) => (
            <div key={i} className={cn("max-w-[85%] rounded-2xl px-4 py-2 text-sm", m.me ? "ml-auto bg-primary text-primary-foreground" : "bg-card")}>{m.t}</div>
          ))}
        </div>
        <div className="flex gap-2 p-4">
          <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Pídele algo a Donna…" className="flex-1 rounded-full border bg-transparent px-4 py-2 text-sm outline-none focus:border-primary" />
          <button onClick={send} className="rounded-full bg-primary px-4 text-sm text-primary-foreground">Enviar</button>
        </div>
      </div>
    </div>
  );
}
