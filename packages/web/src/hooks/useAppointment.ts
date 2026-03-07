import { useQuery } from "@tanstack/react-query";
import { fetchAppointment } from "../graphql/appointment";

export function useAppointment(appointmentId: string, refetchInterval = 5_000) {
  return useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: () => fetchAppointment(appointmentId),
    refetchInterval,
  });
}
