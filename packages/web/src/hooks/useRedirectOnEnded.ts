import { useEffect } from "react";

export function useRedirectOnEnded(status: string | undefined, redirectUrl: string | null) {
  useEffect(() => {
    if (status === "ENDED" && redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [status, redirectUrl]);
}
