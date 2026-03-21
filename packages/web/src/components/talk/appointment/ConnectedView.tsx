import { useMutation } from "@tanstack/react-query";
import { endSession } from "@/graphql/appointment";
import type { useChimeAudio } from "@/hooks/useChimeAudio";
import { AudioWaveBars } from "@/components/common/call/AudioWaveBars";
import { CallStatusBadge } from "@/components/common/call/CallStatusBadge";
import { CallTimer } from "@/components/common/call/CallTimer";
import { CallControls } from "@/components/common/call/CallControls";

type Props = {
  counselorName: string;
  photoUrl?: string | null;
  appointmentId: string;
  sessionId: string;
  elapsedSec: number;
  chime: ReturnType<typeof useChimeAudio>;
};

export function ConnectedView({
  counselorName,
  photoUrl,
  appointmentId,
  sessionId,
  elapsedSec,
  chime,
}: Props) {
  const { muted, toggleMute, toggleSpeaker } = chime;

  const { mutate: end } = useMutation({
    mutationFn: () => endSession(sessionId),
    onSuccess: () => {
      window.location.href = `/talk/appointment/${appointmentId}/end`;
    },
  });

  return (
    <div className="flex flex-col items-center justify-between h-full pt-12 pb-16">
      <div className="flex flex-col items-center gap-4">
        <div className="w-40 h-40 rounded-full overflow-hidden ring-4 ring-emerald-400/30 shrink-0 bg-gray-700">
          {photoUrl ? (
            <img src={photoUrl} alt={counselorName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl font-bold">
              {counselorName[0]}
            </div>
          )}
        </div>
        <p className="text-gray-100 text-2xl font-bold">{counselorName}</p>

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
