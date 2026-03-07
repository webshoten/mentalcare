import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { endAppointment } from "../../graphql/appointment";
import { useAppointment } from "../../hooks/useAppointment";
import { useCallState } from "../../hooks/useCallState";
import { useElapsedSeconds } from "../../hooks/useElapsedSeconds";
import { useEndOnUnload } from "../../hooks/useEndOnUnload";
import { useRedirectOnEnded } from "../../hooks/useRedirectOnEnded";
import { QueryProvider } from "../QueryProvider";

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
  elapsedSec,
}: {
  appointmentId: string;
  counselorId: string;
  elapsedSec: number;
}) {
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  const { mutate: end } = useMutation({
    mutationFn: () => endAppointment(appointmentId),
    onSuccess: () => {
      window.location.href = `/counselor/dashboard/${counselorId}`;
    },
  });

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center justify-between h-full pt-12 pb-16">
      <div className="flex flex-col items-center gap-4">
        <div className="w-40 h-40 rounded-full ring-4 ring-emerald-400/30 bg-indigo-900 flex items-center justify-center shrink-0">
          <svg className="w-20 h-20 text-indigo-300" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <p className="text-gray-100 text-2xl font-bold">相談者</p>

        <div className="flex items-center gap-1.5 bg-emerald-900 rounded-full px-4 py-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-300 text-xs font-semibold">通話中</span>
        </div>

        <p className="text-gray-400 text-sm tabular-nums">{mm}:{ss}</p>

        <div className="flex items-center gap-1 h-10">
          {[3, 6, 9, 7, 4, 8, 5, 3, 7, 9, 6, 4, 8, 5, 3].map((h, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-emerald-400 opacity-80"
              style={{
                height: `${h * 3}px`,
                animation: `pulse ${0.6 + (i % 3) * 0.2}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-end gap-8">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((v) => !v)}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              muted ? "bg-white text-gray-900" : "bg-gray-700 text-white"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {muted ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 19L5 5M12 18.75a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 3a3 3 0 013 3v4.5M9 9.563A3 3 0 0012 12v0" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5v3.75m-3.75 0h7.5M12 3a3 3 0 013 3v4.5a3 3 0 01-6 0V6a3 3 0 013-3z" />
              )}
            </svg>
          </button>
          <span className="text-gray-400 text-xs">{muted ? "ミュート中" : "ミュート"}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => end()}
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-lg"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75L18 6m0 0l2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25M3 3l1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17.25 4.5 21V8.742m.164-4.078a6 6 0 0115.672 0M4.664 4.664L19.5 19.5" />
            </svg>
          </button>
          <span className="text-red-400 text-xs">通話終了</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setSpeakerOn((v) => !v)}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              speakerOn ? "bg-gray-700 text-white" : "bg-white text-gray-900"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {speakerOn ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              )}
            </svg>
          </button>
          <span className="text-gray-400 text-xs">スピーカー</span>
        </div>
      </div>
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
  const callState = useCallState(status);
  const elapsedSec = useElapsedSeconds(callState === "connected");
  useEndOnUnload(appointmentId, status);
  useRedirectOnEnded(status, counselorId ? `/counselor/dashboard/${counselorId}` : null);

  if (callState === "waiting") {
    return (
      <div className="min-h-screen bg-white">
        <WaitingView />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <ConnectedView appointmentId={appointmentId} counselorId={counselorId ?? ""} elapsedSec={elapsedSec} />
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
