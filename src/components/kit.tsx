import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  dark: "bg-card text-card-foreground",
  orange: "bg-primary text-primary-foreground",
  blue: "bg-blue text-foreground",
  soft: "bg-blue-soft text-blue",
  mint: "bg-mint text-ink",
  olive: "bg-olive text-ink",
  lavender: "bg-lavender text-ink",
  cream: "bg-cream text-primary",
  gradient: "bg-brand-gradient text-foreground",
  outline: "border border-border text-foreground",
} as const;
export type Tone = keyof typeof tones;

export function Tile({
  tone = "dark",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("relative flex flex-col overflow-hidden card-compact", tones[tone], className)}
    >
      {children}
    </div>
  );
}

export function Pill({
  children,
  active,
  className,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 h-8 text-sm font-medium transition-colors",
        active
          ? "border-transparent bg-foreground text-background"
          : "border-current/30 hover:bg-foreground/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Big({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("display-num text-6xl md:text-7xl", className)}>{children}</div>;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-sm opacity-70", className)}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title mt-2">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Status({ s }: { s: string }) {
  const map: Record<string, string> = {
    Listo: "bg-mint text-ink",
    "En curso": "bg-primary text-primary-foreground",
    Revisión: "bg-lavender text-ink",
    Bloqueado: "bg-destructive text-destructive-foreground",
    Borrador: "bg-secondary text-secondary-foreground",
    Programado: "bg-blue text-foreground",
    Publicado: "bg-olive text-ink",
  };
  return (
    <span
      className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", map[s] ?? "bg-secondary")}
    >
      {s}
    </span>
  );
}

export function Avatars({ names }: { names: string[] }) {
  return (
    <div className="flex -space-x-2">
      {names.map((n) => (
        <span
          key={n}
          title={n}
          className="grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-secondary text-[10px] font-semibold"
        >
          {n
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)}
        </span>
      ))}
    </div>
  );
}
