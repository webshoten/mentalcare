import { useEffect } from "react";

function sendMutation(mutation: string, appointmentId: string) {
  fetch(`${import.meta.env.PUBLIC_API_URL}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: mutation, variables: { appointmentId } }),
    keepalive: true,
  });
}

const END_MUTATION =
  "mutation EndAppointment($appointmentId: ID!) { endAppointment(appointmentId: $appointmentId) { id } }";

const LEAVE_MUTATION =
  "mutation LeaveAppointment($appointmentId: ID!) { leaveAppointment(appointmentId: $appointmentId) { id } }";

export function useEndOnUnload(appointmentId: string, status: string | undefined) {
  useEffect(() => {
    if (status !== "WAITING" && status !== "ACTIVE") return;

    const handleBeforeUnload = () => {
      if (status === "ACTIVE") {
        // 通話中に離脱 → セッション終了
        sendMutation(END_MUTATION, appointmentId);
      } else {
        // 接続待ち中に離脱 → 枠を OPEN に戻す
        sendMutation(LEAVE_MUTATION, appointmentId);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status, appointmentId]);
}
