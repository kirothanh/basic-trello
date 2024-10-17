/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import PlusIcon from "../icons/PlusIcon";
import ColumnContainer from "./ColumnContainer";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import TaskCard from "./TaskCard";

export default function KanbanBoard({ SERVER_API, apiKey }) {
  const [columns, setColumns] = useState(
    JSON.parse(localStorage.getItem("columns")) || []
  );
  const columnsId = useMemo(() => columns.map((col) => col._id), [columns]);
  const [activeColumn, setActiveColumn] = useState(null);
  const [tasks, setTasks] = useState(
    JSON.parse(localStorage.getItem("tasks")) || []
  );
  const [activeTask, setActiveTask] = useState(null);

  const getTasks = async () => {
    const response = await fetch(`${SERVER_API}/tasks`, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
      },
    });
    const { data } = await response.json();
    const { tasks } = data;

    // setColumns(columns); //columns cần
    setTasks(tasks);
  };

  const postTasks = async (arrayTask) => {
    await fetch(`${SERVER_API}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(arrayTask),
    });
  };

  useEffect(() => {
    localStorage.setItem("columns", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    getTasks();
  }, [apiKey]);

  const generateId = () => {
    return Math.floor(Math.random() * 10001);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const createTask = async (columnId) => {
    const colNeed = columns.find((col) => col._id === columnId);
    const { column, columnName } = colNeed;

    const newTask = {
      _id: uuidv4(),
      column: column,
      columnName: columnName,
      content: `Task ${tasks.length + 1}`,
    };

    const updatedTasks = [
      ...tasks.map((task) => {
        const taskColumn = columns.find((col) => col.column === task.column);
        return {
          ...task,
          columnName: taskColumn
            ? taskColumn.columnName
            : task.columnName || "",
        };
      }),
      newTask,
    ];

    setTasks(updatedTasks);

    const tasksForPost = updatedTasks.map(
      ({ column, content, columnName }) => ({
        column,
        content,
        columnName,
      })
    );
    await postTasks(tasksForPost);
  };

  const deleteTask = async (id) => {
    const newTasks = tasks
      .filter((task) => task._id !== id)
      .map((task) => {
        const taskColumn = columns.find((col) => col.column === task.column);
        return {
          ...task,
          columnName: taskColumn
            ? taskColumn.columnName
            : task.columnName || "",
        };
      });

    setTasks(newTasks);

    const tasksForPost = newTasks.map(({ column, content, columnName }) => ({
      column,
      content,
      columnName,
    }));

    await postTasks(tasksForPost);
  };

  const updateTask = async (id, content) => {
    const newTasks = tasks
      .map((task) => {
        if (task._id !== id) return task;
        return { ...task, content };
      })
      .map((task) => {
        const taskColumn = columns.find((col) => col.column === task.column);
        return {
          ...task,
          columnName: taskColumn
            ? taskColumn.columnName
            : task.columnName || "",
        };
      });

    setTasks(newTasks);

    const tasksForPost = newTasks.map(({ column, content, columnName }) => ({
      column,
      content,
      columnName,
    }));

    await postTasks(tasksForPost);
  };

  const createNewColumn = async () => {
    const columnToAdd = {
      _id: uuidv4(),
      column: generateId(),
      columnName: `Column ${columns.length + 1}`,
    };

    const updatedColumns = [...columns, columnToAdd];

    setColumns(updatedColumns);
  };

  const deleteColumn = async (columnId) => {
    const filteredColumns = columns.filter((col) => col.column !== columnId);

    setColumns(filteredColumns);

    const newTasks = tasks
      .filter((t) => t.column !== columnId)
      .map((task) => {
        const taskColumn = columns.find((col) => col.column === task.column);
        return {
          ...task,
          columnName: taskColumn
            ? taskColumn.columnName
            : task.columnName || "",
        };
      });

    setTasks(newTasks);

    const tasksForPost = newTasks.map(({ column, content, columnName }) => ({
      column,
      content,
      columnName,
    }));

    await postTasks(tasksForPost);
  };

  const updateColumn = async (columnId, columnName) => {
    const newColumns = columns.map((col) => {
      if (col.column !== columnId) return col;
      return { ...col, columnName };
    });

    setColumns(newColumns);

    const updatedTasks = tasks.map((task) => {
      if (task.column !== columnId) return task;
      return { ...task, columnName };
    });

    setTasks(updatedTasks);

    const tasksForPost = updatedTasks.map(
      ({ column, content, columnName }) => ({
        column,
        content,
        columnName,
      })
    );

    await postTasks(tasksForPost);
  };

  const onDragStart = (e) => {
    if (e.active.data.current?.type === "Column") {
      setActiveColumn(e.active.data.current.column);
      return;
    }

    if (e.active.data.current?.type === "Task") {
      setActiveTask(e.active.data.current.task);
      return;
    }
  };

  const onDragEnd = async (e) => {
    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = e;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    if (active.data.current?.type === "Column") {
      setColumns((columns) => {
        const activeIndex = columns.findIndex((col) => col._id === activeId);
        const overIndex = columns.findIndex((col) => col._id === overId);

        const newColumns = arrayMove(columns, activeIndex, overIndex);

        setColumns(newColumns);

        return newColumns;
      });
    }
  };

  const onDragOver = (e) => {
    const { active, over } = e;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveATask = active.data.current?.type === "Task";
    const isOverATask = over.data.current?.type === "Task";

    if (!isActiveATask) return;

    if (isOverATask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t._id === activeId);
        const overIndex = tasks.findIndex((t) => t._id === overId);

        const targetColumn = columns.find(
          (col) => col.column === tasks[overIndex].column
        );

        const updatedTask = {
          ...tasks[activeIndex],
          column: tasks[overIndex].column,
          columnName: targetColumn
            ? targetColumn.columnName
            : tasks[overIndex].columnName,
        };

        const newTasks = [...tasks];
        newTasks.splice(activeIndex, 1);
        newTasks.splice(overIndex, 0, updatedTask);

        console.log("New tasks:", newTasks);

        const tasksForPost = newTasks.map(
          ({ column, content, columnName }) => ({
            column,
            content,
            columnName:
              columnName ||
              columns.find((col) => col.column === column)?.columnName ||
              "",
          })
        );

        console.log("Tasks for post:", tasksForPost);

        postTasks(tasksForPost);

        return newTasks;
      });
    }

    const isOverAColumn = over.data.current?.type === "Column";

    if (isOverAColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t._id === activeId);

        const targetColumn = columns.find((col) => col._id === overId);

        const updatedTask = {
          ...tasks[activeIndex],
          column: targetColumn.column,
          columnName: targetColumn.columnName,
        };

        const newTasks = [...tasks];
        newTasks[activeIndex] = updatedTask;

        console.log("New tasks:", newTasks);

        const tasksForPost = newTasks.map(
          ({ column, content, columnName }) => ({
            column,
            content,
            columnName:
              columnName ||
              columns.find((col) => col.column === column)?.columnName ||
              "",
          })
        );

        console.log("Tasks for post:", tasksForPost);

        postTasks(tasksForPost);

        return newTasks;
      });
    }
  };

  return (
    <div className="m-auto flex min-h-screen w-full items-center overflow-x-auto overflow-y-hidden px-[40px]">
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
      >
        <div className="m-auto flex gap-4">
          <div className="flex gap-4">
            <SortableContext items={columnsId}>
              {columns.map((col) => {
                const filteredTasks = tasks.filter((task) => {
                  return Number.parseInt(task.column) === col.column;
                });

                return (
                  <ColumnContainer
                    key={col._id}
                    column={col}
                    deleteColumn={deleteColumn}
                    updateColumn={updateColumn}
                    createTask={createTask}
                    deleteTask={deleteTask}
                    updateTask={updateTask}
                    tasks={filteredTasks}
                  />
                );
              })}
            </SortableContext>
          </div>
          <button
            onClick={() => createNewColumn()}
            className="h-[60px] w-[350px] min-w-[350px] cursor-pointer rounded-lg bg-mainBackgroundColor border-2 border-columnBackgroundColor p-4 ring-rose-500 hover:ring-2 flex gap-2"
          >
            <PlusIcon />
            Add Column
          </button>
        </div>

        {createPortal(
          <DragOverlay>
            {activeColumn && (
              <ColumnContainer
                column={activeColumn}
                deleteColumn={deleteColumn}
                updateColumn={updateColumn}
                createTask={createTask}
                deleteTask={deleteTask}
                updateTask={updateTask}
                tasks={tasks.filter(
                  (task) => task.column === activeColumn.column
                )}
              />
            )}
            {activeTask && (
              <TaskCard
                task={activeTask}
                deleteTask={deleteTask}
                updateTask={updateTask}
              />
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  );
}
