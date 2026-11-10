import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { PublishingWorkspace, PublishingWorkspaceSkeleton } from "@/components/publishing/workspace";
import { validateSearch } from "@/lib/publishing/queries";

export const Route = createFileRoute("/publishing/")({
  validateSearch,
  component: PublishingIndexPage,
});

function PublishingIndexPage() {
  const search = Route.useSearch();
  return (
    <ClientOnly fallback={<PublishingWorkspaceSkeleton />}>
      <PublishingWorkspace search={search} />
    </ClientOnly>
  );
}
