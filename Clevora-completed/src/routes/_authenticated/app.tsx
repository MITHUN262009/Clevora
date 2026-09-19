import { createFileRoute } from "@tanstack/react-router";
import { ClevoraApp } from "@/components/clevora/clevora-app";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [
    { title: "My day — Clevora" },
    { name: "description", content: "Your Clevora student dashboard, planner, notes, campus and profile." },
    { property: "og:title", content: "My day — Clevora" },
    { property: "og:description", content: "A private student productivity workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ClevoraApp,
});
