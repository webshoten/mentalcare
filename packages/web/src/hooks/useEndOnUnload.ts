import { useEffect } from "react";

function sendMutation(mutation: string, variables: Record<string, string>) {
  fetch(`${import.meta.env.PUBLIC_API_URL}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: mutation, variables }),
    keepalive: true,
  });
}

const END_SESSION_MUTATION =
  "mutation EndSession($sessionId: ID!) { endSession(sessionId: $sessionId) { id } }";

const LEAVE_MUTATION =
  "mutation LeaveAppointment($appointmentId: ID!) { leaveAppointment(appointmentId: $appointmentId) { id } }";

export function useEndOnUnload(
  appointmentId: string,
  status: string | undefined,
  sessionId?: string | null,
) {
  useEffect(() => {
    if (status !== "WAITING" && status !== "ACTIVE") return;

    const handleBeforeUnload = () => {
      if (status === "ACTIVE" && sessionId) {
        sendMutation(END_SESSION_MUTATION, { sessionId });
      } else {
        sendMutation(LEAVE_MUTATION, { appointmentId });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status, appointmentId, sessionId]);
}
