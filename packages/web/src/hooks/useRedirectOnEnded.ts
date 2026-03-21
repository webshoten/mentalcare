import { useEffect, useRef } from "react";

export function useRedirectOnEnded(
  activeSessionId: string | null | undefined,
  redirectUrl: string | null,
) {
  const hadSessionRef = useRef(false);

  useEffect(() => {
    if (activeSessionId) {
      hadSessionRef.current = true;
    }
    // activeSession があった後になくなった = Session 終了
    if (hadSessionRef.current && !activeSessionId && redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [activeSessionId, redirectUrl]);
}
