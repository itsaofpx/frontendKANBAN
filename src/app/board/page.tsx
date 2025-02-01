"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "../components/input";
import { Card } from "../components/card";
import { Button } from "../components/button";
import { Edit, Trash2, ArrowRight, Plus, LogOut } from "lucide-react"; // Import icons

interface UserBoard {
  ID: string;
  BoardID: string;
  BoardName?: string;
}

interface Board {
  ID: string;
  Name: string;
}

export default function UserBoardPage() {
  const [userBoards, setUserBoards] = useState<UserBoard[]>([]);
  const [newUserBoardName, setNewUserBoardName] = useState<string>("");
  const [editingUserBoard, setEditingUserBoard] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUserId = localStorage.getItem("userID");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserBoards();
    }
  }, [userId]);

  const fetchUserBoards = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/userboards/${userId}`
      );
      const userBoards: UserBoard[] = await response.json();

      const userBoardsWithBoardDetails = await Promise.all(
        Array.from(userBoards).map(async (userBoard) => {
          const boardResponse = await fetch(
            `http://localhost:8080/api/boards/${userBoard.BoardID}`
          );
          const board: Board = await boardResponse.json();
          return {
            ...userBoard,
            BoardName: board.Name,
          };
        })
      );

      setUserBoards(userBoardsWithBoardDetails);
    } catch (error) {
      console.error("Error fetching user boards:", error);
      setUserBoards([]);
    }
  };

  const addUserBoard = async () => {
    if (!newUserBoardName.trim() || !userId) return;

    try {
      const userBoardResponse = await fetch(
        "http://localhost:8080/api/boards",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newUserBoardName }),
        }
      );

      if (!userBoardResponse.ok) throw new Error("Failed to create user board");

      const newBoard: Board = await userBoardResponse.json();

      const userBoardPayload = {
        userID: parseInt(userId),
        boardID: parseInt(newBoard.ID),
      };

      const userBoardLinkResponse = await fetch(
        "http://localhost:8080/api/userboards",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userBoardPayload),
        }
      );

      if (!userBoardLinkResponse.ok)
        throw new Error("Failed to link user board to user");

      await fetchUserBoards();

      setNewUserBoardName("");
    } catch (error) {
      console.error("Error creating user board:", error);
    }
  };

  const removeUserBoard = useCallback(async (ID: string) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/userboards/${ID}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user board");
      }

      setUserBoards((prevBoards) =>
        prevBoards.filter((userBoard) => userBoard.ID !== ID)
      );
    } catch (error) {
      console.error("Error deleting user board:", error);
      alert("Failed to delete user board. Please try again.");
    }
  }, []);

  const startEditing = (userBoard: UserBoard) => {
    setEditingUserBoard(userBoard.ID);
    setEditName(userBoard.BoardName || "");
  };

  const saveEdit = async () => {
    if (!editingUserBoard) return;

    try {
      const userBoard = userBoards.find(
        (board) => board.ID === editingUserBoard
      );

      if (!userBoard) {
        throw new Error("User board not found");
      }

      const boardID = userBoard.BoardID;

      const response = await fetch(
        `http://localhost:8080/api/boards/${boardID}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update board name");
      }

      const updatedBoard: Board = await response.json();

      setUserBoards((prevBoards) =>
        prevBoards.map((userBoard) =>
          userBoard.ID === editingUserBoard
            ? { ...userBoard, BoardName: updatedBoard.Name }
            : userBoard
        )
      );

      setEditingUserBoard(null);
      setEditName("");
      fetchUserBoards();
    } catch (error) {
      console.error("Error updating board:", error);
      alert("Failed to update board name. Please try again.");
    }
  };

  const handleDetailsClick = (userBoardId: string) => {
    const board = userBoards.find((userBoard) => userBoard.ID === userBoardId);

    if (board) {
      router.push(`/kanban/${board.BoardID}`);
    } else {
      console.error("Board not found");
      alert("Board not found. Please try again.");
    }
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("userID");
    setUserId(null);
    router.push("/login"); // Redirect to login page after logout
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Your Boards</h1>

      {/* Add User Board Section */}
      <div className="flex gap-4 mb-8">
        <Input
          value={newUserBoardName}
          onChange={(e) => setNewUserBoardName(e.target.value)}
          placeholder="Enter a new board name"
          className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button
          onClick={addUserBoard}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Board
        </Button>
      </div>

      {/* User Board List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.isArray(userBoards) && userBoards.length === 0 ? (
          <div className="text-center py-6 text-gray-500 col-span-full">
            No boards found. Create one to get started!
          </div>
        ) : (
          Array.isArray(userBoards) &&
          Array.from(userBoards).map((userBoard) => (
            <Card
              key={String(userBoard.ID)}
              className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              {editingUserBoard === userBoard.ID ? (
                <div className="space-y-4">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={saveEdit}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-all"
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {userBoard.BoardName}
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => startEditing(userBoard)}
                      className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-all"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => removeUserBoard(userBoard.ID)}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                    <Button
                      onClick={() => handleDetailsClick(userBoard.ID)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Details
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Logout Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={handleLogout}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-all"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}
