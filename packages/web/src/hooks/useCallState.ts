import { useEffect, useState } from "react";

export type CallState = "waiting" | "connected";

export function useCallState(status: string | undefined): CallState {
  const [callState, setCallState] = useState<CallState>("waiting");

  useEffect(() => {
    if (status === "ACTIVE" && callState === "waiting") {
      setCallState("connected");
    }
  }, [status]);

  return callState;
}
