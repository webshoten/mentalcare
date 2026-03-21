import { useQuery } from "@tanstack/react-query";
import { fetchOpenAppointments } from "@/graphql/appointment";
import type { Appointment } from "@/lib/statusInfo";

export function useOpenAppointments() {
  const { data, isLoading } = useQuery({
    queryKey: ["openAppointments"],
    queryFn: fetchOpenAppointments,
    refetchInterval: 20_000,
    staleTime: 20_000,
  });

  const appointments = (data?.openAppointments ?? []) as Appointment[];

  return { appointments, isLoading };
}
