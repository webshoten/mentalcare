import { useAppointment } from "@/hooks/useAppointment";
import { useCallState } from "@/hooks/useCallState";
import { useChimeAudio } from "@/hooks/useChimeAudio";
import { useElapsedSeconds } from "@/hooks/useElapsedSeconds";
import { useEndOnUnload } from "@/hooks/useEndOnUnload";
import { useRedirectOnEnded } from "@/hooks/useRedirectOnEnded";
import { QueryProvider } from "@/components/QueryProvider";
import { WaitingView } from "./WaitingView";
import { ConnectedView } from "./ConnectedView";

type Props = {
  appointmentId: string;
};

function AppointmentViewInner({ appointmentId }: Props) {
  const { data } = useAppointment(appointmentId, 5_000);
  const status = data?.appointment?.status;
  const sessionId = data?.appointment?.activeSession?.id ?? null;
  const callState = useCallState(status);
  const elapsedSec = useElapsedSeconds(callState === "connected");
  const chime = useChimeAudio(sessionId);
  useEndOnUnload(appointmentId, status, sessionId);
  useRedirectOnEnded(sessionId, `/talk/appointment/${appointmentId}/end`);

  const counselor = data?.appointment?.counselor;
  const counselorName = counselor?.name ?? "カウンセラー";
  const photoUrl = counselor?.photoUrl;
  const specialty = counselor?.specialty;

  if (callState === "waiting" || !sessionId) {
    return (
      <div className="min-h-screen bg-white">
        <WaitingView
          counselorName={counselorName}
          photoUrl={photoUrl}
          specialty={specialty}
          onCancel={() => {
            window.location.href = "/talk/home";
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <ConnectedView
        counselorName={counselorName}
        photoUrl={photoUrl}
        appointmentId={appointmentId}
        sessionId={sessionId}
        elapsedSec={elapsedSec}
        chime={chime}
      />
    </div>
  );
}

export function AppointmentView({ appointmentId }: Props) {
  return (
    <QueryProvider>
      <div id="appointment-wrapper" className="min-h-screen">
        <AppointmentViewInner appointmentId={appointmentId} />
      </div>
    </QueryProvider>
  );
}
