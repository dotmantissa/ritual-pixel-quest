import { createFileRoute } from "@tanstack/react-router";
import { PuzzleGame } from "@/components/PuzzleGame";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <PuzzleGame />;
}
