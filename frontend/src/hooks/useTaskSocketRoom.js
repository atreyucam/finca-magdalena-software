import { useEffect } from "react";
import { connectSocket, getSocket } from "../lib/socket";

export default function useTaskSocketRoom(tareaId, handlers = {}, deps = []) {
  useEffect(() => {
    if (!Number.isInteger(Number(tareaId)) || Number(tareaId) <= 0) return undefined;

    connectSocket();
    const socket = getSocket();
    const normalizedTaskId = Number(tareaId);
    const entries = Object.entries(handlers).filter(([, fn]) => typeof fn === "function");

    socket.emit("join:tarea", normalizedTaskId);
    for (const [eventName, fn] of entries) {
      socket.on(eventName, fn);
    }

    return () => {
      socket.emit("leave:tarea", normalizedTaskId);
      for (const [eventName, fn] of entries) {
        socket.off(eventName, fn);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareaId, ...deps]);
}

