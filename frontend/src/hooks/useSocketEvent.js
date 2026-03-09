import { useEffect } from "react";
import { connectSocket, getSocket } from "../lib/socket";

export default function useSocketEvent(eventName, handler, deps = []) {
  useEffect(() => {
    if (!eventName || typeof handler !== "function") return undefined;

    connectSocket();
    const socket = getSocket();
    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, ...deps]);
}

