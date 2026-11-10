import { createFileRoute } from "@tanstack/react-router";
import { PublishingWorkspace } from "@/components/publishing/workspace";
import { validateSearch } from "@/lib/publishing/queries";

export const Route = createFileRoute("/publishing")({
  head: () => ({
    meta: [
      { title: "Publishing — CEREBRO OS" },
      {
        name: "description",
        content: "Administra obras musicales, splits y registros editoriales en BMI y The MLC.",
      },
      { property: "og:title", content: "Publishing — CEREBRO OS" },
      {
        property: "og:description",
        content: "Control de metadata y registros editoriales de obras musicales.",
      },
    ],
  }),
  validateSearch,
  component: PublishingPage,
});

function PublishingPage() {
  const search = Route.useSearch();
  return <PublishingWorkspace search={search} />;
}
