import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { createAppointment, fetchCounselorAppointment, joinAppointment } from "../../graphql/appointment";
import { fetchCounselor } from "../../graphql/counselor";
import { QueryProvider } from "../QueryProvider";

type Props = {
  counselorId: string;
};

function AvailabilityBadge({ availability }: { availability: string }) {
  const map: Record<string, { label: string; className: string }> = {
    AVAILABLE: { label: "対応中", className: "bg-green-100 text-green-700 border-green-200" },
    SOON: { label: "まもなく開始", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    LATER: { label: "後ほど開始", className: "bg-blue-100 text-blue-700 border-blue-200" },
    OFFLINE: { label: "オフライン", className: "bg-gray-100 text-gray-500 border-gray-200" },
  };
  const { label, className } = map[availability] ?? map.OFFLINE;
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-0.5 text-xs font-semibold ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${availability === "AVAILABLE" ? "bg-green-500 animate-pulse" : "bg-current opacity-60"}`} />
      {label}
    </span>
  );
}

function AppointmentManagerInner({ counselorId }: Props) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saved, setSaved] = useState(false);

  const { data: counselorData } = useQuery({
    queryKey: ["counselor", counselorId],
    queryFn: () => fetchCounselor(counselorId),
  });

  const { data: appointmentData, refetch: refetchAppointment } = useQuery({
    queryKey: ["counselorAppointment", counselorId],
    queryFn: () => fetchCounselorAppointment(counselorId),
    refetchInterval: 5_000,
    staleTime: 5_000,
  });

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () => createAppointment(counselorId, startTime, endTime),
    onSuccess: () => {
      setSaved(true);
      refetchAppointment();
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const { mutate: join, isPending: isJoining } = useMutation({
    mutationFn: (appointmentId: string) => joinAppointment(appointmentId),
    onSuccess: (data) => {
      window.location.href = `/counselor/${counselorId}/appointment/${data.joinAppointment.appointment.id}`;
    },
  });

  const counselor = counselorData?.counselor;
  const appointment = appointmentData?.counselorAppointment;
  const isWaiting = appointment?.status === "WAITING";
  const isActive = appointment?.status === "ACTIVE";

  const isValid = startTime.length === 5 && endTime.length === 5 && startTime < endTime;

  const handleGoToSession = () => {
    if (!appointment?.id) return;
    if (isActive) {
      window.location.href = `/counselor/${counselorId}/appointment/${appointment.id}`;
      return;
    }
    join(appointment.id);
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-10 flex flex-col gap-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {counselor?.name ?? "カウンセラー"} さん
          </h1>
          {counselor && (
            <p className="text-sm text-gray-500 mt-0.5">{counselor.specialty ?? ""}</p>
          )}
        </div>
        {appointment && <AvailabilityBadge availability={appointment.availability} />}
      </div>

      {/* 予定作成カード */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
          <h2 className="text-base font-bold text-gray-900">本日の予定</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-semibold text-gray-500">開始</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>
          <span className="text-gray-300 text-2xl mt-5">—</span>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-semibold text-gray-500">終了</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={!isValid || isSaving}
          onClick={() => save()}
          className="w-full py-3 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "作成中..." : saved ? "作成しました ✓" : "予定を確定する"}
        </button>
      </div>

      {/* 確定した予定カード */}
      {appointment && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-base font-bold text-gray-900">確定した予定</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-lg font-bold text-gray-900 tabular-nums">
                  {appointment.scheduledStart} — {appointment.scheduledEnd}
                  <span className="text-xs font-normal text-gray-400 ml-1">JST</span>
                </span>
                {appointment.availableAt && appointment.availability !== "AVAILABLE" && (
                  <span className="text-xs text-gray-400">
                    開始予定: {new Date(appointment.availableAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              <AvailabilityBadge availability={appointment.availability} />
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-gray-700">相談者の状態</span>
                <span className={`text-xs font-medium ${isActive || isWaiting ? "text-emerald-600" : "text-gray-400"}`}>
                  {isActive ? "相談中です" : isWaiting ? "相談者が待機中です" : "まだ接続していません"}
                </span>
              </div>

              {isActive ? (
                <button
                  type="button"
                  onClick={handleGoToSession}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  通話に戻る
                </button>
              ) : isWaiting ? (
                <button
                  type="button"
                  onClick={handleGoToSession}
                  disabled={isJoining}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  {isJoining ? "接続中..." : "接続する"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGoToSession}
                  disabled={isJoining}
                  className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  {isJoining ? "入室中..." : "待機する"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export function CounselorAppointmentManager({ counselorId }: Props) {
  return (
    <QueryProvider>
      <AppointmentManagerInner counselorId={counselorId} />
    </QueryProvider>
  );
}
