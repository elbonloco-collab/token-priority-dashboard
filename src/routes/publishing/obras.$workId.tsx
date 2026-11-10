import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { WorkSheetPage } from "@/components/publishing/WorkSheetPage";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/publishing/obras/$workId")({
  head: () => ({
    meta: [
      { title: "Hoja de Obra — CEREBRO OS" },
      {
        name: "description",
        content: "Detalle completo de una obra musical: datos, splits, grabaciones, registros y historial.",
      },
      { property: "og:title", content: "Hoja de Obra — CEREBRO OS" },
    ],
  }),
  validateSearch: ({ returnTo, section }) => ({
    returnTo: returnTo ? String(returnTo) : "/publishing",
    section: section ? String(section) : "summary",
  }),
  component: WorkSheetRoute,
});

function WorkSheetRoute() {
  return (
    <ClientOnly fallback={<WorkSheetSkeleton />}>
      <WorkSheetPage />
    </ClientOnly>
  );
}

function WorkSheetSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
