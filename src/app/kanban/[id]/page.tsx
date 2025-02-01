// app/kanban/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import KanbanBoard from "@/app/components/kanban"; // Adjust the path as needed

const KanbanPage = () => {
  // useParams returns an object with keys corresponding to the dynamic segments
  const { id } = useParams();

  // The `id` is a string, so you may need to convert it to a number
  const boardId = Number(id);

  return (
    <div>
      <h1 className="text-2xl font-bold p-4">Kanban Board</h1>
      <KanbanBoard boardId={boardId} />
    </div>
  );
};

export default KanbanPage;
