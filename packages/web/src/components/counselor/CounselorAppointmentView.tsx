import { useMutation } from "@tanstack/react-query";
import { endSession } from "../../graphql/appointment";
import { useAppointment } from "../../hooks/useAppointment";
import { useCallState } from "../../hooks/useCallState";
import { useChimeAudio } from "../../hooks/useChimeAudio";
import { useElapsedSeconds } from "../../hooks/useElapsedSeconds";
import { useEndOnUnload } from "../../hooks/useEndOnUnload";
import { useRedirectOnEnded } from "../../hooks/useRedirectOnEnded";
import { QueryProvider } from "../QueryProvider";
import { AudioWaveBars } from "../common/call/AudioWaveBars";
import { CallStatusBadge } from "../common/call/CallStatusBadge";
import { CallTimer } from "../common/call/CallTimer";
import { CallControls } from "../common/call/CallControls";

type Props = {
  appointmentId: string;
};

// ──────────────────────────────
// 待機中 UI（カウンセラー視点）
// ──────────────────────────────
function WaitingView() {
  return (
    <div className="flex flex-col items-center gap-8 pt-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
        <p className="text-gray-900 text-xl font-bold">相談者を待っています...</p>
        <p className="text-gray-500 text-sm">相談者が接続するまでお待ちください。</p>
      </div>

      <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl px-6 py-4">
        <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-900 font-semibold text-base">相談者</span>
          <span className="text-gray-400 text-xs">接続待ち</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────
// 通話中 UI（カウンセラー視点）
// ──────────────────────────────
function ConnectedView({
  appointmentId,
  counselorId,
  sessionId,
  elapsedSec,
  chime,
}: {
  appointmentId: string;
  counselorId: string;
  sessionId: string;
  elapsedSec: number;
  chime: ReturnType<typeof useChimeAudio>;
}) {
  const { muted, toggleMute, toggleSpeaker } = chime;

  const { mutate: end } = useMutation({
    mutationFn: () => endSession(sessionId),
    onSuccess: () => {
      window.location.href = `/counselor/${counselorId}/appointment/${appointmentId}/end?reason=self`;
    },
  });

  return (
    <div className="flex flex-col items-center justify-between h-full pt-12 pb-16">
      <div className="flex flex-col items-center gap-4">
        <div className="w-40 h-40 rounded-full ring-4 ring-emerald-400/30 bg-indigo-900 flex items-center justify-center shrink-0">
          <svg className="w-20 h-20 text-indigo-300" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <p className="text-gray-100 text-2xl font-bold">相談者</p>

        <CallStatusBadge />
        <CallTimer elapsedSec={elapsedSec} />
        <AudioWaveBars />
      </div>

      <CallControls
        muted={muted}
        onToggleMute={toggleMute}
        onEnd={() => end()}
        onToggleSpeaker={toggleSpeaker}
      />
    </div>
  );
}

// ──────────────────────────────
// メインコンポーネント
// ──────────────────────────────
function CounselorAppointmentViewInner({ appointmentId }: Props) {
  const { data } = useAppointment(appointmentId, 3_000);
  const status = data?.appointment?.status;
  const counselorId = data?.appointment?.counselorId ?? null;
  const sessionId = data?.appointment?.activeSession?.id ?? null;
  const callState = useCallState(status);
  const elapsedSec = useElapsedSeconds(callState === "connected");
  const chime = useChimeAudio(sessionId);
  useEndOnUnload(appointmentId, status, sessionId);
  useRedirectOnEnded(sessionId, counselorId ? `/counselor/${counselorId}/appointment/${appointmentId}/end?reason=remote` : null);

  if (callState === "waiting" || !sessionId) {
    return (
      <div className="min-h-screen bg-white">
        <WaitingView />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <ConnectedView
        appointmentId={appointmentId}
        counselorId={counselorId ?? ""}
        sessionId={sessionId}
        elapsedSec={elapsedSec}
        chime={chime}
      />
    </div>
  );
}

export function CounselorAppointmentView({ appointmentId }: Props) {
  return (
    <QueryProvider>
      <div id="counselor-appointment-wrapper" className="min-h-screen">
        <CounselorAppointmentViewInner appointmentId={appointmentId} />
      </div>
    </QueryProvider>
  );
}
