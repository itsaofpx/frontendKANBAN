"use client";
import React, { useCallback, useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { AlertCircle, ArrowLeft, PencilIcon, Plus, Tag, Trash2, UserPlus, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { useRouter } from "next/navigation";

interface Board {
  ID: number;
  Name: string;
  Columns: Column[];
  Members: User[];
}

interface Column {
  ID: number;
  Name: string;
  BoardID: number;
  Tasks: Task[];
}

interface Task {
  ID: number;
  Name: string;
  Content: string;
  ColumnID: number;
  Tags: Tag[];
  UserTasks?: UserTask[];
}

interface UserTask {
  TaskID: number;
  UserID: number;
}

interface Tag {
  ID: number;
  Name: string;
  Color: string;
}

interface User {
  ID: number;
  Name: string;
  Email: string;
}

const KanbanBoard = ({ boardId }: { boardId: number }) => {
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  const [newTask, setNewTask] = useState({
    Name: "",
    Content: "",
    ColumnID: 0,
    TagIDs: [] as number[],
  });


  const availableTags: Tag[] = [
    { ID: 1, Name: "Urgent", Color: "#DC2626" }, // red-600
    { ID: 2, Name: "Backlog", Color: "#4B5563" }, // gray-600
    { ID: 3, Name: "In Progress", Color: "#2563EB" }, // blue-600
    { ID: 4, Name: "Done", Color: "#059669" }, // emerald-600
    { ID: 5, Name: "Blocked", Color: "#D97706" }, // amber-600
  ];

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:8080/api/boards/${boardId}`
      );
      if (!response.ok)
        throw new Error(`Failed to fetch board: ${response.statusText}`);
      const data: Board = await response.json();
      setBoard(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch board"
      );
      console.error("Error fetching board:", error);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !board) return;

    const { source, destination, draggableId } = result;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const sourceColIndex = board.Columns.findIndex(
      (col) => col.ID.toString() === source.droppableId
    );
    const destColIndex = board.Columns.findIndex(
      (col) => col.ID.toString() === destination.droppableId
    );

    if (sourceColIndex === -1 || destColIndex === -1) return;

    const newColumns = [...board.Columns];
    const task = newColumns[sourceColIndex].Tasks.find(
      (t) => t.ID.toString() === draggableId
    );

    if (!task) return;

    const updatedTask = { ...task, ColumnID: newColumns[destColIndex].ID };
    newColumns[sourceColIndex].Tasks = newColumns[sourceColIndex].Tasks.filter(
      (t) => t.ID !== task.ID
    );
    newColumns[destColIndex].Tasks.splice(destination.index, 0, updatedTask);

    setBoard({ ...board, Columns: newColumns });

    try {
      const response = await fetch(
        `http://localhost:8080/api/tasks/${task.ID}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ColumnID: updatedTask.ColumnID }),
        }
      );

      if (!response.ok) throw new Error("Failed to update task position");
    } catch (error) {
      console.error("Error updating task:", error);
      fetchBoard(); // Refresh board state on error
    }
  };

  const addColumn = async () => {
    if (!newColumnName.trim()) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`http://localhost:8080/api/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Name: newColumnName,
          BoardID: boardId,
          Tasks: [],
        }),
      });

      if (!response.ok) throw new Error("Failed to add column");

      const newColumn = await response.json();
      setBoard((prev) =>
        prev ? { ...prev, Columns: [...prev.Columns, newColumn] } : prev
      );
      setNewColumnName("");
    } catch (error) {
      setError("Failed to add column");
    } finally {
      setIsUpdating(false);
    }
  };

  // First, add the deleteColumn function:
  const deleteColumn = async (columnId: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this column and all its tasks?"
      )
    ) {
      return;
    }
    
    setIsUpdating(true);
    try {
      const response = await fetch(
        `http://localhost:8080/api/columns/${columnId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to delete column: ${response.statusText}`);
      }
      
      // Update local state by removing the deleted column
      setBoard((prevBoard) => {
        if (!prevBoard) return null;
        return {
          ...prevBoard,
          Columns: prevBoard.Columns.filter((col) => col.ID !== columnId),
        };
      });
    } catch (error) {
      console.error("Error deleting column:", error);
      setError("Failed to delete column. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };
  
  const addTask = async () => {
    if (!newTask.ColumnID) {
      setError("Please select a column");
      return;
    }

    setIsUpdating(true);
    try {
      // Modified taskData to include TagIDs instead of Tags
      const taskData = {
        Name: newTask.Name || "New Task",
        Content: newTask.Content || "",
        ColumnID: newTask.ColumnID,
        Tags : Tag.name
      };

      const response = await fetch(`http://localhost:8080/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) throw new Error("Failed to add task");

      const createdTask = await response.json();

      // Add Tags to the created task for display
      const taskWithTags = {
        ...createdTask,
        Tags: availableTags.filter((tag) => newTask.TagIDs.includes(tag.ID)),
      };

      setBoard((prev) =>
        prev
          ? {
              ...prev,
              Columns: prev.Columns.map((col) =>
                col.ID === newTask.ColumnID
                  ? { ...col, Tasks: [...col.Tasks, taskWithTags] }
                  : col
              ),
            }
          : prev
      );

      fetchBoard();
      setNewTask({ Name: "", Content: "", ColumnID: 0, TagIDs: [] });
    } catch (error) {
      setError("Failed to add task");
      console.error("Error adding task:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`http://localhost:8080/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      setBoard(prevBoard => {
        if (!prevBoard) return null;
        return {
          ...prevBoard,
          Columns: prevBoard.Columns.map(col => ({
            ...col,
            Tasks: col.Tasks.filter(task => task.ID !== taskId)
          }))
        };
      });
    } catch (error) {
      setError('Failed to delete task');
    } finally {
      setIsUpdating(false);
    }
  };

  const updateTask = async (taskId: number) => {
    if (!editingTask) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`http://localhost:8080/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Name: editingTask.Name,
          Content: editingTask.Content,
          TagIDs: editingTask.Tags.map(tag => tag.ID)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      setBoard(prevBoard => {
        if (!prevBoard) return null;
        return {
          ...prevBoard,
          Columns: prevBoard.Columns.map(col => ({
            ...col,
            Tasks: col.Tasks.map(task => 
              task.ID === taskId ? editingTask : task
            )
          }))
        };
      });

      setEditingTask(null);
    } catch (error) {
      setError('Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  const inviteUser = async () => {
    if (!inviteEmail.trim()) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`http://localhost:8080/api/boards/${boardId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail
        })
      });

      if (!response.ok) {
        throw new Error('Failed to invite user');
      }

      setInviteEmail('');
      await fetchBoard(); // Refresh board to get updated members list
    } catch (error) {
      setError('Failed to invite user');
    } finally {
      setIsUpdating(false);
    }
  };

  const assignUsersToTask = async (taskId: number, userIds: number[]) => {
    try {
      const response = await fetch(`http://localhost:8080/api/tasks/${taskId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds
        })
      });

      if (!response.ok) {
        throw new Error('Failed to assign users');
      }

      await fetchBoard(); // Refresh to get updated assignments
    } catch (error) {
      setError('Failed to assign users to task');
    }
  };

   return (
    <div className="p-6 space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <h1 className="text-2xl font-bold">{board?.Name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Board Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
            <div>
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="New Column Name"
                className="w-full p-2 border rounded"
              />
              <button
                onClick={addColumn}
                disabled={isUpdating || !newColumnName.trim()}
                className="mt-2 w-full bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                <Plus className="inline-block mr-2 h-4 w-4" />
                {isUpdating ? "Adding Column..." : "Add Column"}
              </button>
            </div>
            <div>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Invite User Email"
                className="w-full p-2 border rounded"
              />
              <button
                onClick={inviteUser}
                disabled={isUpdating || !inviteEmail.trim()}
                className="mt-2 w-full bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                <UserPlus className="inline-block mr-2 h-4 w-4" />
                {isUpdating ? "Inviting..." : "Invite User"}
              </button>
            </div>
          </div>
          
        </CardContent>
        
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Create New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
            <input
              type="text"
              value={newTask.Name}
              onChange={(e) => setNewTask({ ...newTask, Name: e.target.value })}
              placeholder="Task Name"
              className="p-2 border rounded"
            />
            <textarea
              value={newTask.Content}
              onChange={(e) =>
                setNewTask({ ...newTask, Content: e.target.value })
              }
              placeholder="Task Description"
              className="p-2 border rounded"
              rows={3}
            />
            <select
              value={newTask.ColumnID}
              onChange={(e) =>
                setNewTask({ ...newTask, ColumnID: Number(e.target.value) })
              }
              className="p-2 border rounded"
            >
              <option value={0}>Select Column</option>
              {board?.Columns.map((column) => (
                <option key={column.ID} value={column.ID}>
                  {column.Name}
                </option>
              ))}
            </select>
            <select
              multiple
              value={newTask.TagIDs.map(String)}
              onChange={(e) => {
                const selectedOptions = Array.from(
                  e.target.selectedOptions,
                  (option) => parseInt(option.value)
                );
                setNewTask({ ...newTask, TagIDs: selectedOptions });
              }}
              className="p-2 border rounded min-h-[100px]"
            >
              {availableTags.map((tag) => (
                <option
                  key={tag.ID}
                  value={tag.ID}
                  className="p-2 my-1"
                  style={{
                    backgroundColor: `${tag.Color}20`,
                    color: tag.Color,
                  }}
                >
                  {tag.Name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
        <CardFooter>
          <button
            onClick={addTask}
            disabled={isUpdating || !newTask.ColumnID}
            className="w-full bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            <Plus className="inline-block mr-2 h-4 w-4" />
            {isUpdating ? "Adding Task..." : "Add Task"}
          </button>
        </CardFooter>
      </Card>
      {/* Task editing modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Edit Task</CardTitle>
              <button 
                onClick={() => setEditingTask(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  type="text"
                  value={editingTask.Name}
                  onChange={(e) => setEditingTask({...editingTask, Name: e.target.value})}
                  className="w-full p-2 border rounded"
                />
                <textarea
                  value={editingTask.Content}
                  onChange={(e) => setEditingTask({...editingTask, Content: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
                <select
                  multiple
                  value={editingTask.Tags.map(tag => tag.ID.toString())}
                  onChange={(e) => {
                    const selectedTags = Array.from(e.target.selectedOptions, option => 
                      availableTags.find(tag => tag.ID === parseInt(option.value))
                    ).filter((tag): tag is Tag => tag !== undefined);
                    setEditingTask({...editingTask, Tags: selectedTags});
                  }}
                  className="w-full p-2 border rounded"
                >
                  {availableTags.map(tag => (
                    <option 
                      key={tag.ID} 
                      value={tag.ID}
                      style={{
                        backgroundColor: `${tag.Color}20`,
                        color: tag.Color
                      }}
                    >
                      {tag.Name}
                    </option>
                  ))}
                </select>
                <select
                  multiple
                  value={selectedUsers.map(user => user.toString())}
                  onChange={(e) => {
                    const selected = Array.from(
                      e.target.selectedOptions,
                      option => parseInt(option.value)
                    );
                    setSelectedUsers(selected);
                  }}
                  className="w-full p-2 border rounded"
                >
                  {board?.Members.map(member => (
                    <option key={member.ID} value={member.ID}>
                      {member.Name} ({member.Email})
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <button
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateTask(editingTask.ID);
                  if (selectedUsers.length > 0) {
                    assignUsersToTask(editingTask.ID, selectedUsers);
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Save Changes
              </button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Rest of the component with task cards */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {board?.Columns.map((column) => (
            <Droppable
              key={column.ID}
              droppableId={column.ID.toString()}
              isCombineEnabled={false}
              isDropDisabled={false}
              ignoreContainerClipping={true}
            >
              {(provided) => (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{column.Name}</CardTitle>
                    <button
                      onClick={() => deleteColumn(column.ID)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardHeader>
                  <CardContent
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="min-h-[200px]"
                  >
                    {column.Tasks?.filter(task => task?.ID != null).map((task, index) => (
                      <Draggable
                        key={task.ID}
                        draggableId={task.ID.toString()}
                        index={index}
                      >
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="mb-4"
                          >
                            <CardHeader className="flex flex-row items-center justify-between">
                              <CardTitle className="text-sm font-medium text-black">
                                {task.Name}
                              </CardTitle>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setEditingTask(task)}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.ID)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-500 mb-3">
                                {task.Content}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {task.Tags?.map((tag) => (
                                  <div
                                    key={tag.ID}
                                    className="px-2 py-1 text-xs rounded-full flex items-center font-medium"
                                    style={{
                                      backgroundColor: `${tag.Color}20`,
                                      color: tag.Color,
                                      border: `1px solid ${tag.Color}40`,
                                    }}
                                  >
                                    {tag.Name}
                                  </div>
                                ))}
                              </div>
                              {task.UserTasks && task.UserTasks.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs text-gray-500">Assigned to:</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {task.UserTasks.map(userTask => {
                                      const user = board.Members.find(m => m.ID === userTask.UserID);
                                      return user ? (
                                        <span 
                                          key={user.ID}
                                          className="text-xs bg-gray-100 px-2 py-1 rounded"
                                        >
                                          {user.Name}
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;