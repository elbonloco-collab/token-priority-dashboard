import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublishingWork } from "@/lib/publishing/types";
import type { Party } from "@/lib/publishing/types";
import { registrationStatusLabels, statusLabels } from "./status";
import { computeCompleteness, type WorkSort } from "@/lib/publishing/queries";

interface WorksTableProps {
  works: PublishingWork[];
  parties: Record<string, Party>;
  onSelect: (work: PublishingWork) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sort: WorkSort | undefined;
  sortDir: "asc" | "desc";
  onSortChange: (sort: WorkSort, dir: "asc" | "desc") => void;
}

function partyName(parties: Record<string, Party>, id: string): string {
  const p = parties[id];
  if (!p) return "Desconocido";
  return p.stageName || p.legalName;
}

export function WorksTable({
  works,
  parties,
  onSelect,
  page,
  pageSize,
  onPageChange,
  sort,
  sortDir,
  onSortChange,
}: WorksTableProps) {
  const totalPages = Math.max(1, Math.ceil(works.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const paged = useMemo(
    () => works.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [works, currentPage, pageSize],
  );

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div className="space-y-3">
      {isMobile ? (
        <div className="space-y-2">
          {paged.map((work) => {
            const isrc = work.recordings.find((r) => r.isrc)?.isrc ?? "—";
            const iswc = work.iswc ?? "—";
            const artists =
              work.recordings
                .map((r) => (r.artistPartyId ? partyName(parties, r.artistPartyId) : "—"))
                .filter((a) => a !== "—")
                .join(", ") || "—";
            return (
              <div
                key={work.id}
                className="rounded-xl border bg-card p-3"
                onClick={() => onSelect(work)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium truncate">{work.title}</div>
                    <div className="text-xs text-muted-foreground">{work.internalCode}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {statusLabels[work.status]}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex-1 truncate">{artists}</span>
                  <span>
                    ISRC {isrc} · ISWC {iswc}
                  </span>
                </div>
                <div className="mt-2 w-full bg-muted/50 rounded-full h-1.5">
                  <div
                    className="h-1.5 bg-primary rounded-full"
                    style={{ width: `${computeCompleteness(work)}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground text-right">
                  {computeCompleteness(work)}% completo
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th
                  className="p-3 font-medium cursor-pointer hover:bg-muted/30"
                  onClick={() => onSortChange("title", sortDir === "asc" ? "desc" : "asc")}
                >
                  Obra{sort === "title" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
                <th
                  className="p-3 font-medium cursor-pointer hover:bg-muted/30"
                  onClick={() => onSortChange("status", sortDir === "asc" ? "desc" : "asc")}
                >
                  Estado{sort === "status" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
                <th className="p-3 font-medium">Artista / Compositores</th>
                <th
                  className="p-3 font-medium cursor-pointer hover:bg-muted/30"
                  onClick={() => onSortChange("completeness", sortDir === "asc" ? "desc" : "asc")}
                >
                  Completitud{sort === "completeness" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
                <th className="p-3 font-medium">BMI</th>
                <th className="p-3 font-medium">MLC</th>
                <th className="p-3 font-medium">ISRC / ISWC</th>
                <th className="p-3 font-medium">Lanzamiento</th>
                <th className="p-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((work) => {
                const isrc = work.recordings.find((r) => r.isrc)?.isrc ?? "—";
                const iswc = work.iswc ?? "—";
                const artists =
                  work.recordings
                    .map((r) => (r.artistPartyId ? partyName(parties, r.artistPartyId) : "—"))
                    .filter((a) => a !== "—")
                    .join(", ") || "—";
                const composers =
                  work.writers.map((w) => partyName(parties, w.partyId)).join(", ") || "—";
                return (
                  <tr
                    key={work.id}
                    className="cursor-pointer border-t hover:bg-accent/40 transition-colors"
                    onClick={() => onSelect(work)}
                  >
                    <td className="p-3">
                      <div className="font-medium truncate">{work.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {work.internalCode}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {statusLabels[work.status]}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground truncate">
                      <div>{composers}</div>
                      <div className="text-[10px]">{artists}</div>
                    </td>
                    <td className="p-3">
                      <div className="w-full bg-muted/50 rounded-full h-1.5">
                        <div
                          className="h-1.5 bg-primary rounded-full"
                          style={{ width: `${computeCompleteness(work)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {computeCompleteness(work)}%
                      </div>
                    </td>
                    <td className="p-3 text-xs">{registrationShort(work, "BMI")}</td>
                    <td className="p-3 text-xs">{registrationShort(work, "MLC")}</td>
                    <td className="p-3 text-xs text-muted-foreground truncate">
                      {isrc} · {iswc}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {work.recordings.find((r) => r.releaseDate)?.releaseDate || "—"}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(work);
                        }}
                      >
                        Abrir
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {works.length > 100 && (
            <div className="flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange(currentPage - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function registrationShort(work: PublishingWork, society: "BMI" | "MLC"): string {
  const r = work.registrations.find((x) => x.society === society);
  if (!r) return "—";
  return registrationStatusLabels[r.status];
}
