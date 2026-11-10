import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { Tile } from "@/components/kit";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demoWorks } from "@/lib/publishing/demo-data";
import { usePublishingStore, rehydrateStore, registerHydrationCallbacks } from "@/lib/publishing/store";
import type { PublishingWork, Section } from "@/lib/publishing/types";
import type { WorkFilter, SearchParams, PendingTask, IssueCounts } from "@/lib/publishing/queries";
import {
  getIssueCounts,
  getPendingTasks,
  DEFAULT_NO_RESPONSE_DAYS,
  filterWorks,
  makeId,
  toFlatSearch,
} from "@/lib/publishing/queries";
import { PendingQueue } from "./PendingQueue";
import { FilterBar } from "./FilterBar";
import { WorksTable } from "./WorksTable";
import { savedViewsStore } from "@/lib/publishing/saved-views";

const sectionNames: Record<Section, string> = {
  overview: "Pendientes",
  works: "Obras",
  people: "Personas",
  recordings: "Grabaciones",
  imports: "Importar",
};

function createBlankWork(worksCount: number): PublishingWork {
  const timestamp = new Date().toISOString();
  return {
    id: makeId(),
    title: "Sin título",
    alternateTitles: [],
    language: "Español",
    durationSeconds: null,
    versionNote: "",
    isDerivative: false,
    status: "draft",
    iswc: null,
    bmiWorkId: null,
    mlcSongCode: null,
    internalCode: `CRB-${new Date().getFullYear()}-${String(worksCount + 1).padStart(3, "0")}`,
    hasContract: false,
    sampleFlag: false,
    sampleNotes: "",
    controlledSharePercent: 100,
    notes: "",
    writers: [],
    publishers: [],
    recordings: [],
    registrations: [],
    splitAgreement: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

export function PublishingWorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-10 w-full max-w-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

export function PublishingWorkspaceContent({ search, now }: { search: SearchParams; now: Date }) {
  const navigate = useNavigate();
  const works = usePublishingStore((s) => s.works);
  const parties = usePublishingStore((s) => s.parties);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);

  const visibleWorks = useMemo(() => works.filter((work) => work.deletedAt === null), [works]);

  const issueCounts: IssueCounts = useMemo(() => getIssueCounts(visibleWorks), [visibleWorks]);
  const pendingTasks: PendingTask[] = useMemo(
    () => getPendingTasks(visibleWorks, now, DEFAULT_NO_RESPONSE_DAYS),
    [visibleWorks, now],
  );
  const pendingWorksCount = useMemo(
    () => new Set(pendingTasks.flatMap((task) => task.works.map((work) => work.id))).size,
    [pendingTasks],
  );

  const partiesRecord = useMemo(() => Object.fromEntries(parties.map((p) => [p.id, p])), [parties]);

  const filteredWorks = useMemo(
    () => filterWorks(visibleWorks, search.filter),
    [visibleWorks, search.filter],
  );

  const recordingsCount = useMemo(
    () => visibleWorks.reduce((total, work) => total + work.recordings.length, 0),
    [visibleWorks],
  );

  const sectionCounts: Partial<Record<Section, number>> = {
    overview: pendingWorksCount,
    works: visibleWorks.length,
    people: parties.length,
    recordings: recordingsCount,
  };

  const updateSearch = (partial: Partial<SearchParams>) => {
    const nextFilter: WorkFilter = { ...search.filter };
    if (partial.filter) {
      for (const [key, value] of Object.entries(partial.filter)) {
        if (value === undefined || value === false || value === "" || value === "all") {
          delete nextFilter[key as keyof WorkFilter];
        } else {
          (nextFilter as Record<string, unknown>)[key] = value;
        }
      }
    }
    const next: SearchParams = {
      filter: nextFilter,
      section: partial.section ?? search.section,
      page: partial.page ?? (partial.filter ? 1 : search.page),
      pageSize: partial.pageSize ?? search.pageSize,
    };
    void navigate({ to: "/publishing", search: toFlatSearch(next), replace: true });
  };

  const openWork = (work: PublishingWork) => {
    void navigate({
      to: "/publishing/obras/$workId",
      params: { workId: work.id },
      search: { returnTo: "/publishing", section: "summary" },
    });
  };

  const handleNewWork = () => {
    const work = createBlankWork(works.length);
    usePublishingStore.getState().upsertWork(work);
    openWork(work);
  };

  const handleCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
    setCsvPreview(rows.slice(0, 7));
  };

  const saveCsvPreview = () => {
    if (csvPreview.length < 2) return;
    const headers = csvPreview[0]!.map((header) => header.toLowerCase());
    const titleIndex = headers.indexOf("title");
    if (titleIndex < 0) return;
    const timestamp = new Date().toISOString();
    const additions = csvPreview
      .slice(1)
      .map((row, index) => {
        const title = row[titleIndex]?.trim();
        if (!title) return null;
        const duplicate = visibleWorks.some(
          (work) => work.title.toLowerCase() === title.toLowerCase(),
        );
        if (duplicate) return null;
        const base = {
          ...demoWorks[3]!,
          id: makeId(),
          title,
          internalCode: `CRB-${new Date().getFullYear()}-IMP${index + 1}`,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        return base;
      })
      .filter((work): work is PublishingWork => work !== null);
    additions.forEach((w) => usePublishingStore.getState().upsertWork(w));
    setCsvPreview([]);
    updateSearch({ section: "works", page: 1 });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/publishing">Publishing</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{sectionNames[search.section]}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-semibold tracking-tight">Publishing</h1>
          <p className="text-sm text-muted-foreground">
            Obras, splits y registros en BMI y The MLC, preparados para el agente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/40 text-primary">
            Datos de demostración
          </Badge>
          <Button onClick={handleNewWork}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva obra
          </Button>
        </div>
      </div>

      <Tabs
        value={search.section}
        onValueChange={(value) => updateSearch({ section: value as Section, page: 1 })}
      >
        <TabsList className="h-10 w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
          {(Object.keys(sectionNames) as Section[]).map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              className="h-10 shrink-0 rounded-none border-b-2 border-transparent px-3 text-sm text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {sectionNames[key]}
              {sectionCounts[key] !== undefined && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                  {sectionCounts[key]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {search.section === "overview" && (
        <PendingQueue
          works={visibleWorks}
          parties={partiesRecord}
          counts={issueCounts}
          now={now}
          onAction={(work) => {
            if (work.id) {
              openWork(work);
            } else {
              updateSearch({ section: "works", page: 1 });
            }
          }}
          onOpenIdentifier={(work) => openWork(work)}
        />
      )}

      {search.section === "works" && (
        <div className="space-y-4">
          <FilterBar
            filter={search.filter}
            onChange={(chip, checked) => {
              if (chip.kind === "search") {
                updateSearch({ filter: { search: checked ? chip.value : "" }, page: 1 });
              } else if (chip.kind === "status") {
                updateSearch({
                  filter: { status: checked ? (chip.value as WorkFilter["status"]) : "all" },
                  page: 1,
                });
              } else if (chip.kind === "bmi") {
                updateSearch({
                  filter: { bmi: checked ? (chip.value as WorkFilter["bmi"]) : undefined },
                  page: 1,
                });
              } else if (chip.kind === "mlc") {
                updateSearch({
                  filter: { mlc: checked ? (chip.value as WorkFilter["mlc"]) : undefined },
                  page: 1,
                });
              } else if (chip.kind === "flag") {
                updateSearch({ filter: { [chip.value]: checked }, page: 1 });
              } else if (chip.kind === "split") {
                updateSearch({ filter: { split: checked ? chip.value : undefined }, page: 1 });
              }
            }}
            onClear={() => {
              updateSearch({ filter: { status: "all" }, page: 1 });
            }}
            activeChips={[
              ...(search.filter.status && search.filter.status !== "all"
                ? [{ kind: "status" as const, value: search.filter.status }]
                : []),
              ...(search.filter.bmi ? [{ kind: "bmi" as const, value: search.filter.bmi }] : []),
              ...(search.filter.mlc ? [{ kind: "mlc" as const, value: search.filter.mlc }] : []),
              ...(search.filter.missingIsrc
                ? [{ kind: "flag" as const, value: "missingIsrc" as const }]
                : []),
              ...(search.filter.missingIswc
                ? [{ kind: "flag" as const, value: "missingIswc" as const }]
                : []),
              ...(search.filter.missingMlcSongCode
                ? [{ kind: "flag" as const, value: "missingMlcSongCode" as const }]
                : []),
              ...(search.filter.hasContract !== undefined
                ? [{ kind: "flag" as const, value: "hasContract" as const }]
                : []),
              ...(search.filter.hasSample
                ? [{ kind: "flag" as const, value: "hasSample" as const }]
                : []),
              ...(search.filter.split
                ? [{ kind: "split" as const, value: search.filter.split }]
                : []),
              ...(search.filter.search
                ? [{ kind: "search" as const, value: search.filter.search }]
                : []),
            ]}
            onSaveView={(name, filter) => {
              savedViewsStore.save({ name, filter, createdAt: new Date().toISOString() });
            }}
            onLoadView={(filter) => {
              updateSearch({ filter, page: 1 });
            }}
          />
          <WorksTable
            works={filteredWorks}
            parties={partiesRecord}
            onSelect={openWork}
            page={search.page}
            pageSize={search.pageSize}
            onPageChange={(page) => updateSearch({ page })}
            sort={search.filter.sort}
            sortDir={search.filter.sortDir ?? "asc"}
            onSortChange={(sort, dir) => updateSearch({ filter: { sort, sortDir: dir } })}
          />
        </div>
      )}

      {search.section === "people" && (
        <Tile className="p-4">
          <h2 className="text-xl font-semibold mb-4">Personas</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {parties.map((party) => (
              <div
                key={party.id}
                className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-lg font-medium text-secondary">
                    {party.legalName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{party.legalName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {party.stageName || "Sin nombre artístico"}
                    </p>
                  </div>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tipo</dt>
                    <dd>
                      {party.type === "writer"
                        ? "Compositor"
                        : party.type === "publisher"
                          ? "Editorial"
                          : "Otro"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">IPI</dt>
                    <dd>{party.ipi ?? "Pendiente"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">PRO</dt>
                    <dd>{party.pro ?? "Pendiente"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Miembro PRO</dt>
                    <dd>{party.proMemberNumber ?? "Pendiente"}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </Tile>
      )}

      {search.section === "recordings" && (
        <Tile className="p-4">
          <h2 className="text-xl font-semibold mb-4">Grabaciones</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleWorks.flatMap((work) =>
              work.recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold">{recording.title}</h3>
                  <p className="text-sm text-muted-foreground">{work.title}</p>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">ISRC</dt>
                      <dd>{recording.isrc ?? "Pendiente"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Duración</dt>
                      <dd>
                        {recording.durationSeconds
                          ? `${Math.floor(recording.durationSeconds / 60)}:${String(recording.durationSeconds % 60).padStart(2, "0")}`
                          : "Pendiente"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Fecha lanzamiento</dt>
                      <dd>{recording.releaseDate ?? "Pendiente"}</dd>
                    </div>
                  </dl>
                </div>
              )),
            )}
          </div>
        </Tile>
      )}

      {search.section === "imports" && (
        <Tile className="p-4">
          <h2 className="text-xl font-semibold mb-4">Importar CSV</h2>
          <Input type="file" accept=".csv" onChange={handleCsv} />
          {csvPreview.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">
                Vista previa ({csvPreview.length - 1} filas):
              </p>
              <div className="overflow-x-auto rounded-lg border max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {csvPreview[0]!.map((h) => (
                        <th key={h} className="p-2 text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(1, 7).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell) => (
                          <td key={cell} className="p-2 border-t">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button className="mt-3" onClick={saveCsvPreview}>
                Guardar como obras
              </Button>
            </div>
          )}
        </Tile>
      )}
    </div>
  );
}

export function PublishingWorkspace({ search }: { search: SearchParams }) {
  const hasHydrated = usePublishingStore((s) => s._hasHydrated);
  const [now] = useState(() => new Date());

  useEffect(() => {
    registerHydrationCallbacks();
    void rehydrateStore();
  }, []);

  if (!hasHydrated) {
    return <PublishingWorkspaceSkeleton />;
  }

  return <PublishingWorkspaceContent search={search} now={now} />;
}
