import { createFileRoute, Outlet } from "@tanstack/react-router";

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
  component: PublishingLayout,
});

function PublishingLayout() {
  return <Outlet />;
}
