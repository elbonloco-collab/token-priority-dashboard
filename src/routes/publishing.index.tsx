import { useMemo } from "react";
import { ClientOnly, createFileRoute, type SearchSchemaInput } from "@tanstack/react-router";
import {
  PublishingWorkspace,
  PublishingWorkspaceSkeleton,
} from "@/components/publishing/workspace";
import { normalizeSearch, validateSearch, type FlatSearchInput } from "@/lib/publishing/queries";

export const Route = createFileRoute("/publishing/")({
  // La URL guarda la forma plana mínima (?tab=works&status=draft). `SearchSchemaInput` hace que
  // navigate/Link acepten esa forma con todo opcional.
  validateSearch: (search: FlatSearchInput & SearchSchemaInput) => normalizeSearch(search),
  component: PublishingIndexPage,
});

function PublishingIndexPage() {
  const flat = Route.useSearch();
  const search = useMemo(() => validateSearch(flat), [flat]);
  return (
    <ClientOnly fallback={<PublishingWorkspaceSkeleton />}>
      <PublishingWorkspace search={search} />
    </ClientOnly>
  );
}
