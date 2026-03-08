import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  createChimeAttendee,
  createChimeMeeting,
  fetchAppointments,
  fetchChimeStatus,
} from "../../graphql/appointment";
import { fetchCounselors, seedDatabase } from "../../graphql/counselor";
import { QueryProvider } from "../QueryProvider";

type Tab = "tables" | "chime" | "chime-status" | "links";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-blue-900/60 text-blue-300",
  WAITING: "bg-yellow-900/60 text-yellow-300",
  ACTIVE: "bg-green-900/60 text-green-300",
  ENDED: "bg-gray-800 text-gray-500",
};

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${className}`}>
      {text}
    </span>
  );
}

// ──────────────────────────────
// TabBar
// ──────────────────────────────
function TabBar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "tables", label: "テーブル" },
    { id: "chime", label: "Chime 双方向テスト" },
    { id: "chime-status", label: "Chime 接続状態" },
    { id: "links", label: "リンク" },
  ];
  return (
    <div className="flex border-b border-[#1E293B] px-6 shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === tab.id
              ? "border-orange-400 text-orange-400"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────
// Links Tab
// ──────────────────────────────
type Appointment = {
  id: string;
  counselorId: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  createdAt: string;
  endedAt: string | null;
};
type Counselor = {
  id: string;
  name: string;
  rating: number | null;
  specialty: string | null;
  experienceYears: number | null;
};

function LinksTab({
  appointments,
  counselors,
}: {
  appointments: Appointment[];
  counselors: Counselor[];
}) {
  return (
    <div className="flex gap-8">
      {/* 相談者向け */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2 pb-2 mb-1 border-b border-[#1E293B]">
          <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
          <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">
            相談者向け
          </span>
        </div>
        <a
          href="/talk/home"
          className="flex items-center justify-between px-3 py-2 rounded bg-[#1E293B] border border-[#334155] hover:border-indigo-500/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="text-indigo-300 font-mono text-xs font-bold group-hover:text-indigo-200">
              /talk/home
            </span>
            <span className="text-gray-500 text-xs">バブルUI</span>
          </div>
          <span className="text-gray-600 text-xs">→</span>
        </a>
        {appointments
          .filter((a) => a.status !== "ENDED")
          .map((a) => (
            <a
              key={a.id}
              href={`/talk/appointment/${a.id}`}
              className="flex items-center justify-between px-3 py-2 rounded bg-[#1E293B] border border-[#334155] hover:border-indigo-500/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-indigo-300 font-mono text-xs font-bold group-hover:text-indigo-200 truncate">
                  /talk/appointment/{a.id.slice(0, 8)}…
                </span>
                <Badge text={a.status} className={STATUS_STYLE[a.status] ?? STATUS_STYLE.ENDED} />
              </div>
              <span className="text-gray-600 text-xs shrink-0">→</span>
            </a>
          ))}
      </div>

      {/* カウンセラー向け */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2 pb-2 mb-1 border-b border-[#1E293B]">
          <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
          <span className="text-orange-400 text-xs font-bold uppercase tracking-widest">
            カウンセラー向け
          </span>
        </div>
        {counselors.map((c) => (
          <a
            key={c.id}
            href={`/counselor/dashboard/${c.id}`}
            className="flex items-center justify-between px-3 py-2 rounded bg-[#1E293B] border border-[#334155] hover:border-orange-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-orange-200 font-mono text-xs font-bold group-hover:text-orange-100 truncate">
                /counselor/dashboard/{c.id}
              </span>
              <span className="text-gray-500 text-xs shrink-0">{c.name}</span>
            </div>
            <span className="text-gray-600 text-xs shrink-0">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────
// Chime 接続状態タブ
// ──────────────────────────────
type ChimeAttendeeInfo = { attendeeId: string; externalUserId: string };
type ChimeAppointmentStatus = {
  appointmentId: string;
  appointmentStatus: string;
  chimeMeetingId: string | null;
  attendees: ChimeAttendeeInfo[] | null;
};

function ChimeStatusTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["chime-status"],
    queryFn: fetchChimeStatus,
    refetchInterval: 20_000,
  });

  const rows = (data?.chimeStatus ?? []) as ChimeAppointmentStatus[];
  const activeMeetings = rows.filter((r) => r.chimeMeetingId && (r.attendees?.length ?? 0) > 0).length;
  const totalAttendees = rows.reduce((sum, r) => sum + (r.attendees?.length ?? 0), 0);
  const noMeeting = rows.filter((r) => !r.chimeMeetingId).length;

  return (
    <div className="flex flex-col gap-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "アクティブな Meeting", value: activeMeetings, color: "#22C55E" },
          { label: "接続中 Attendee 総数", value: totalAttendees, color: "#60A5FA" },
          { label: "Meeting なし（OPEN）", value: noMeeting, color: "#94A3B8" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="flex flex-col gap-1 rounded-lg border border-[#334155] bg-[#1E293B] px-4 py-3"
          >
            <span className="text-[#64748B] text-[10px] font-bold">{label}</span>
            <span className="text-3xl font-bold" style={{ color }}>{isLoading ? "…" : value}</span>
          </div>
        ))}
      </div>

      {/* テーブル */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-200 font-bold text-sm">Appointment × Chime 接続状態</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#334155] bg-[#1E293B]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[#64748B] text-[10px]">20秒ポーリング</span>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-[10px] text-gray-400 hover:text-white border border-[#334155] rounded px-2.5 py-1 transition-colors"
            >
              ↻ 今すぐ更新
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-[#1E293B] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1E293B] text-[#64748B]">
                {["appointmentId", "status", "chimeMeetingId", "接続中 / 登録", "Attendee 状態"].map((col) => (
                  <th key={col} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-gray-500 text-center">読み込み中...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-gray-500 text-center">Appointment なし</td></tr>
              ) : (
                rows.map((row, i) => {
                  const count = row.attendees?.length ?? 0;
                  const hasMeeting = !!row.chimeMeetingId;
                  const countColor = count >= 2 ? "#22C55E" : count === 1 ? "#F97316" : "#475569";
                  return (
                    <tr key={row.appointmentId} className={i % 2 === 0 ? "bg-[#0F172A]" : "bg-[#111827]"}>
                      <td className="px-3 py-3 text-indigo-300 font-mono whitespace-nowrap">
                        {row.appointmentId.slice(0, 8)}…
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          text={row.appointmentStatus}
                          className={STATUS_STYLE[row.appointmentStatus] ?? "bg-gray-800 text-gray-400"}
                        />
                      </td>
                      <td className="px-3 py-3 text-[#94A3B8] font-mono text-[10px] whitespace-nowrap">
                        {row.chimeMeetingId ? `${row.chimeMeetingId.slice(0, 22)}…` : <span className="text-[#334155]">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        {hasMeeting ? (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold"
                            style={{ borderColor: countColor, color: countColor }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: countColor }} />
                            {count} 人
                          </div>
                        ) : (
                          <span className="text-[#334155]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {!hasMeeting ? (
                          <span className="text-[#334155] italic text-[10px]">Meeting 未作成</span>
                        ) : (row.attendees ?? []).length === 0 ? (
                          <span className="text-[#475569] text-[10px]">接続者なし</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(row.attendees ?? []).map((at) => (
                              <span
                                key={at.attendeeId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-indigo-500/40 bg-[#1C1F2E] text-[10px] text-indigo-300"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                {at.externalUserId.replace(/^user-\d+$/, "user")}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────
// Chime 双方向テスト
// ──────────────────────────────
type StepState = "idle" | "pending" | "done" | "error";
type LogEntry = { time: string; color: string; message: string };

type MeetingInfo = {
  meetingId: string;
  mediaRegion: string;
  mediaPlacement: {
    audioHostUrl: string;
    audioFallbackUrl: string;
    signalingUrl: string;
    turnControlUrl: string;
  };
};
type AttendeeInfo = { attendeeId: string; externalUserId: string; joinToken: string };

function timestamp() {
  return new Date().toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function buildSession(meeting: MeetingInfo, attendee: AttendeeInfo) {
  const {
    DefaultMeetingSession,
    MeetingSessionConfiguration,
    ConsoleLogger,
    LogLevel,
    DefaultDeviceController,
  } = await import("amazon-chime-sdk-js");
  const logger = new ConsoleLogger("ChimeDebug", LogLevel.WARN);
  const deviceController = new DefaultDeviceController(logger);
  const config = new MeetingSessionConfiguration(
    {
      MeetingId: meeting.meetingId,
      MediaRegion: meeting.mediaRegion,
      MediaPlacement: {
        AudioHostUrl: meeting.mediaPlacement.audioHostUrl,
        AudioFallbackUrl: meeting.mediaPlacement.audioFallbackUrl,
        SignalingUrl: meeting.mediaPlacement.signalingUrl,
        TurnControlUrl: meeting.mediaPlacement.turnControlUrl,
        ScreenDataUrl: "",
        ScreenSharingUrl: "",
        ScreenViewingUrl: "",
        EventIngestionUrl: "",
      },
    },
    {
      AttendeeId: attendee.attendeeId,
      ExternalUserId: attendee.externalUserId,
      JoinToken: attendee.joinToken,
    },
  );
  return new DefaultMeetingSession(config, logger, deviceController);
}

function EventLog({ entries, onClear }: { entries: LogEntry[]; onClear: () => void }) {
  return (
    <div className="flex flex-col rounded-lg border border-[#1E293B] bg-[#0A1628] min-h-[120px] flex-1">
      <div className="flex items-center justify-between px-3 h-8 bg-[#131E2E] rounded-t-lg border-b border-[#1E293B]">
        <span className="text-[#64748B] text-[10px] font-bold">接続イベントログ</span>
        <button
          type="button"
          onClick={onClear}
          className="text-[#475569] text-[10px] hover:text-gray-300 transition-colors"
        >
          クリア
        </button>
      </div>
      <div className="flex flex-col gap-1 p-2 overflow-y-auto">
        {entries.length === 0 ? (
          <span className="text-[#334155] text-xs italic">— ログ待機中 —</span>
        ) : (
          entries.map((e, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[#475569] text-[10px] shrink-0 font-mono">{e.time}</span>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: e.color }}
              />
              <span className="text-[11px] font-mono" style={{ color: e.color }}>
                {e.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StepBtn({
  label,
  state,
  disabled,
  onClick,
}: {
  label: string;
  state: StepState;
  disabled: boolean;
  onClick: () => void;
}) {
  const active = !disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state === "pending"}
      className={`w-full text-xs font-bold px-3 py-2 rounded transition-colors disabled:cursor-not-allowed ${
        active
          ? "bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-[#1E293B] disabled:text-gray-600"
          : "bg-[#1E293B] text-gray-600"
      }`}
    >
      {state === "pending" ? "実行中..." : label}
    </button>
  );
}

function ChimePanel({
  side,
  externalMeetingInfo,
  onMeetingCreated,
}: {
  side: "counselor" | "client";
  externalMeetingInfo: MeetingInfo | null;
  onMeetingCreated?: (info: MeetingInfo) => void;
}) {
  const isCounselor = side === "counselor";
  const accent = isCounselor ? "text-orange-400" : "text-indigo-400";
  const dotColor = isCounselor ? "bg-orange-400" : "bg-indigo-400";

  const [ownMeeting, setOwnMeeting] = useState<MeetingInfo | null>(null);
  const meetingInfo = isCounselor ? ownMeeting : externalMeetingInfo;

  const [meetingStep, setMeetingStep] = useState<StepState>("idle");
  const [attendee, setAttendee] = useState<AttendeeInfo | null>(null);
  const [attendeeStep, setAttendeeStep] = useState<StepState>("idle");
  const [connectStep, setConnectStep] = useState<StepState>("idle");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);

  const addLog = (message: string, color: string) =>
    setLogs((prev) => [...prev, { time: timestamp(), color, message }]);

  const handleCreateMeeting = async () => {
    setMeetingStep("pending");
    try {
      const data = await createChimeMeeting();
      setOwnMeeting(data.createChimeMeeting);
      onMeetingCreated?.(data.createChimeMeeting);
      setMeetingStep("done");
      addLog("CreateMeeting — 成功", "#22C55E");
    } catch (e) {
      setMeetingStep("error");
      addLog("CreateMeeting — 失敗: " + (e instanceof Error ? e.message : "エラー"), "#EF4444");
    }
  };

  const handleCreateAttendee = async () => {
    if (!meetingInfo) return;
    setAttendeeStep("pending");
    try {
      const data = await createChimeAttendee(meetingInfo.meetingId);
      setAttendee(data.createChimeAttendee);
      setAttendeeStep("done");
      addLog("CreateAttendee — 成功", "#22C55E");
    } catch (e) {
      setAttendeeStep("error");
      addLog("CreateAttendee — 失敗: " + (e instanceof Error ? e.message : "エラー"), "#EF4444");
    }
  };

  const handleConnect = async () => {
    if (!meetingInfo || !attendee) return;
    setConnectStep("pending");
    try {
      const session = await buildSession(meetingInfo, attendee);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.audioVideo as any).addObserver({
        audioVideoDidStart: () => addLog("audioVideoDidStart — 接続完了", "#22C55E"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioVideoDidStop: (_: any) => addLog("audioVideoDidStop — 切断", "#EF4444"),
        connectionDidBecomeGood: () => addLog("connectionDidBecomeGood", "#22C55E"),
        connectionDidBecomePoor: () => addLog("connectionDidBecomePoor — 品質低下", "#F97316"),
      });

      session.audioVideo.realtimeSubscribeToAttendeeIdPresence(
        (atId, present, externalUserId) => {
          if (atId !== attendee.attendeeId) {
            addLog(
              `attendeeIdPresenceDidChange — ${externalUserId ?? atId} ${present ? "が入室" : "が退室"}`,
              present ? "#A5B4FC" : "#94A3B8",
            );
          }
        },
      );

      session.audioVideo.start();
      setConnectStep("done");
    } catch (e) {
      setConnectStep("error");
      addLog("接続失敗: " + (e instanceof Error ? e.message : "エラー"), "#EF4444");
    }
  };

  const handleCopy = () => {
    if (!ownMeeting) return;
    navigator.clipboard.writeText(ownMeeting.meetingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const attendeeReady = isCounselor ? meetingStep === "done" : !!externalMeetingInfo;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Panel header */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
        <span className={`text-xs font-bold ${accent}`}>
          {isCounselor ? "カウンセラー側" : "相談者側"}
        </span>
      </div>
      <p className="text-[#64748B] text-[11px] -mt-2">
        {isCounselor
          ? "Meeting を作成して Attendee として参加します"
          : "左の Meeting ID を使って別 Attendee として参加します"}
      </p>

      {/* Step: Create Meeting (counselor only) */}
      {isCounselor && (
        <div
          className={`flex flex-col gap-2 rounded-lg p-3 border ${
            meetingStep === "done"
              ? "bg-[#1E293B] border-indigo-500/40"
              : "bg-[#131E2E] border-[#1E293B]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                meetingStep === "done" ? "bg-indigo-600 text-white" : "bg-[#1E293B] text-gray-500"
              }`}
            >
              1
            </span>
            <span
              className={`text-xs font-bold ${meetingStep === "done" ? "text-gray-100" : "text-gray-500"}`}
            >
              CreateMeeting
            </span>
            {meetingStep === "done" && <span className="ml-auto text-green-400 text-xs">✓</span>}
          </div>
          <StepBtn
            label="▶ Meeting 作成"
            state={meetingStep}
            disabled={meetingStep === "done"}
            onClick={handleCreateMeeting}
          />
        </div>
      )}

      {/* Meeting ID display */}
      {isCounselor ? (
        ownMeeting && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#0F2A1A] border border-[#166534]">
            <span className="text-green-400 text-[10px] font-bold shrink-0">Meeting ID</span>
            <span className="text-green-300 text-[10px] font-mono truncate flex-1">
              {ownMeeting.meetingId}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded bg-[#166534] text-green-400 hover:bg-green-800 transition-colors"
            >
              {copied ? "✓" : "コピー"}
            </button>
          </div>
        )
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#1E293B] border border-[#334155]">
          <span className="text-[#94A3B8] text-[10px] font-bold shrink-0">Meeting ID</span>
          <span className="text-[#CBD5E1] text-[10px] font-mono truncate flex-1">
            {externalMeetingInfo ? externalMeetingInfo.meetingId : "（左パネルで Meeting 作成後に自動入力）"}
          </span>
          {externalMeetingInfo && (
            <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded bg-[#1E3A5F] text-blue-400">
              自動入力
            </span>
          )}
        </div>
      )}

      {/* Step: Create Attendee */}
      <div
        className={`flex flex-col gap-2 rounded-lg p-3 border ${
          attendeeReady
            ? attendeeStep === "done"
              ? "bg-[#1E293B] border-indigo-500/40"
              : "bg-[#1E293B] border-[#334155]"
            : "bg-[#131E2E] border-[#1E293B]"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              attendeeReady ? "bg-indigo-600 text-white" : "bg-[#1E293B] text-gray-500"
            }`}
          >
            {isCounselor ? "2" : "1"}
          </span>
          <span
            className={`text-xs font-bold ${attendeeReady ? "text-gray-100" : "text-gray-500"}`}
          >
            CreateAttendee
          </span>
          {attendeeStep === "done" && <span className="ml-auto text-green-400 text-xs">✓</span>}
        </div>
        <p className={`text-[10px] ${attendeeReady ? "text-gray-400" : "text-gray-600"}`}>
          {isCounselor ? "Meeting に Attendee を追加。JoinToken 取得" : "同じ Meeting に 2人目の Attendee を追加"}
        </p>
        <StepBtn
          label="▶ Attendee 作成"
          state={attendeeStep}
          disabled={!attendeeReady || attendeeStep === "done"}
          onClick={handleCreateAttendee}
        />
      </div>

      {/* Step: Connect */}
      <div
        className={`flex flex-col gap-2 rounded-lg p-3 border ${
          attendeeStep === "done"
            ? connectStep === "done"
              ? "bg-[#1E293B] border-green-500/40"
              : "bg-[#1E293B] border-[#334155]"
            : "bg-[#131E2E] border-[#1E293B]"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              attendeeStep === "done" ? "bg-indigo-600 text-white" : "bg-[#1E293B] text-gray-500"
            }`}
          >
            {isCounselor ? "3" : "2"}
          </span>
          <span
            className={`text-xs font-bold ${attendeeStep === "done" ? "text-gray-100" : "text-gray-500"}`}
          >
            SDK 初期化 → 接続
          </span>
          {connectStep === "done" && <span className="ml-auto text-green-400 text-xs">✓ 接続中</span>}
        </div>
        <p className={`text-[10px] ${attendeeStep === "done" ? "text-gray-400" : "text-gray-600"}`}>
          MeetingSession を構築し audioVideo.start()
        </p>
        <StepBtn
          label="▶ 初期化 → 接続"
          state={connectStep}
          disabled={attendeeStep !== "done" || connectStep === "done"}
          onClick={handleConnect}
        />
      </div>

      {/* Event log */}
      <EventLog entries={logs} onClear={() => setLogs([])} />
    </div>
  );
}

function ChimeTab() {
  const [sharedMeetingInfo, setSharedMeetingInfo] = useState<MeetingInfo | null>(null);

  return (
    <div className="flex h-full divide-x divide-[#1E293B]">
      <div className="flex-1 p-6 overflow-y-auto">
        <ChimePanel
          side="counselor"
          externalMeetingInfo={null}
          onMeetingCreated={setSharedMeetingInfo}
        />
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        <ChimePanel side="client" externalMeetingInfo={sharedMeetingInfo} />
      </div>
    </div>
  );
}

// ──────────────────────────────
// Tables Tab
// ──────────────────────────────
function TablesTab({
  counselors,
  appointments,
  loadingCounselors,
  loadingAppointments,
  seeding,
  seedDone,
  seedFailed,
  seedResult,
  seedError,
  onSeed,
}: {
  counselors: Counselor[];
  appointments: Appointment[];
  loadingCounselors: boolean;
  loadingAppointments: boolean;
  seeding: boolean;
  seedDone: boolean;
  seedFailed: boolean;
  seedResult: { seedDatabase: { seeded: number } } | undefined;
  seedError: Error | null;
  onSeed: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      {/* アクション */}
      <section>
        <h2 className="text-gray-200 font-bold mb-3">アクション</h2>
        <div className="flex items-center gap-3 bg-[#1E293B] rounded-lg p-4">
          <button
            type="button"
            onClick={onSeed}
            disabled={seeding}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded transition-colors"
          >
            {seeding ? "⏳ 実行中..." : "▶ Seed 実行"}
          </button>
          {seedDone && (
            <span className="text-green-400 text-xs">
              ✓ {seedResult?.seedDatabase.seeded} 件のカウンセラーをシードしました
            </span>
          )}
          {seedFailed && (
            <span className="text-red-400 text-xs">
              ✗ エラー: {seedError instanceof Error ? seedError.message : "不明なエラー"}
            </span>
          )}
        </div>
      </section>

      {/* CounselorTable */}
      <section>
        <h2 className="text-gray-200 font-bold mb-3">
          CounselorTable
          <span className="ml-2 text-gray-500 font-normal text-xs">{counselors.length} items</span>
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[#1E293B]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1E293B] text-gray-400">
                {["id", "name", "rating", "specialty", "experienceYears"].map((col) => (
                  <th key={col} className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingCounselors ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-gray-500 text-center">
                    読み込み中...
                  </td>
                </tr>
              ) : counselors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-gray-500 text-center">
                    データなし — Seed 実行してください
                  </td>
                </tr>
              ) : (
                counselors.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? "bg-[#0F172A]" : "bg-[#111827]"}>
                    <td className="px-3 py-2 text-indigo-300 whitespace-nowrap">{c.id}</td>
                    <td className="px-3 py-2 text-gray-200 whitespace-nowrap">{c.name}</td>
                    <td className="px-3 py-2 text-gray-300">{c.rating ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                      {c.specialty ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-400">{c.experienceYears ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* AppointmentTable */}
      <section>
        <h2 className="text-gray-200 font-bold mb-3">
          AppointmentTable
          <span className="ml-2 text-gray-500 font-normal text-xs">
            {appointments.length} items
          </span>
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[#1E293B]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1E293B] text-gray-400">
                {[
                  "id",
                  "counselorId",
                  "status",
                  "scheduledStart (JST)",
                  "scheduledEnd (JST)",
                  "createdAt",
                  "endedAt",
                ].map((col) => (
                  <th key={col} className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingAppointments ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-gray-500 text-center">
                    読み込み中...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-gray-500 text-center">
                    データなし
                  </td>
                </tr>
              ) : (
                appointments.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 0 ? "bg-[#0F172A]" : "bg-[#111827]"}>
                    <td className="px-3 py-2 text-indigo-300 font-mono whitespace-nowrap">
                      <a href={`/talk/appointment/${a.id}`} className="hover:underline">
                        {a.id.slice(0, 8)}…
                      </a>
                    </td>
                    <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{a.counselorId}</td>
                    <td className="px-3 py-2">
                      <Badge
                        text={a.status}
                        className={STATUS_STYLE[a.status] ?? "bg-gray-100 text-gray-400"}
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-300">{a.scheduledStart}</td>
                    <td className="px-3 py-2 text-gray-300">{a.scheduledEnd}</td>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                      {a.endedAt ? new Date(a.endedAt).toLocaleString("ja-JP") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ──────────────────────────────
// DebugPanel 本体
// ──────────────────────────────
function DebugPanelInner() {
  const [activeTab, setActiveTab] = useState<Tab>("tables");

  const {
    data: counselorData,
    isLoading: loadingCounselors,
    refetch: refetchCounselors,
  } = useQuery({ queryKey: ["debug-counselors"], queryFn: fetchCounselors });

  const {
    data: appointmentData,
    isLoading: loadingAppointments,
    refetch: refetchAppointments,
  } = useQuery({ queryKey: ["debug-appointments"], queryFn: fetchAppointments });

  const counselors = counselorData?.counselors ?? [];
  const appointments = appointmentData?.appointments ?? [];

  const {
    mutate: runSeed,
    isPending: seeding,
    isSuccess: seedDone,
    isError: seedFailed,
    data: seedResult,
    error: seedError,
  } = useMutation({
    mutationFn: seedDatabase,
    onSuccess: () => {
      refetchCounselors();
      refetchAppointments();
    },
  });

  const handleRefresh = () => {
    refetchCounselors();
    refetchAppointments();
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-gray-100 font-mono text-sm flex flex-col">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-8 h-14 bg-[#0F172A] border-b border-[#1E293B] shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-orange-400 font-bold text-base">MentalCare</span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-200 font-bold">Debug Panel</span>
          <span className="bg-green-900 text-green-300 text-xs px-2 py-0.5 rounded font-semibold">
            development
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-[#334155] rounded px-3 py-1.5 transition-colors"
        >
          ↻ 更新
        </button>
      </header>

      {/* タブバー */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* コンテンツ */}
      <div
        className={`flex-1 overflow-y-auto ${activeTab === "chime" ? "overflow-hidden" : "p-6"}`}
      >
        {activeTab === "tables" && (
          <TablesTab
            counselors={counselors}
            appointments={appointments}
            loadingCounselors={loadingCounselors}
            loadingAppointments={loadingAppointments}
            seeding={seeding}
            seedDone={seedDone}
            seedFailed={seedFailed}
            seedResult={seedResult}
            seedError={seedError instanceof Error ? seedError : null}
            onSeed={() => runSeed()}
          />
        )}
        {activeTab === "chime" && <ChimeTab />}
        {activeTab === "chime-status" && <ChimeStatusTab />}
        {activeTab === "links" && (
          <LinksTab appointments={appointments} counselors={counselors} />
        )}
      </div>
    </div>
  );
}

export function DebugPanel() {
  return (
    <QueryProvider>
      <DebugPanelInner />
    </QueryProvider>
  );
}
