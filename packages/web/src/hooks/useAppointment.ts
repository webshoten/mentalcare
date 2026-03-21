import { useQuery } from "@tanstack/react-query";
import { fetchAppointment } from "../graphql/appointment";

export function useAppointment(appointmentId: string, refetchInterval = 5_000) {
  return useQuery({
    // LINK: packages/functions/src/typedefs.ts:124
    queryKey: ["appointment", appointmentId],
    queryFn: () => fetchAppointment(appointmentId),
    refetchInterval,
    staleTime: refetchInterval,
  });
}
