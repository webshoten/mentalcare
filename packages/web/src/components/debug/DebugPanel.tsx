import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchAppointments } from "../../graphql/appointment";
import { fetchCounselors, seedDatabase } from "../../graphql/counselor";
import { QueryProvider } from "../QueryProvider";

type Tab = "tables" | "chime";

const STATUS_STYLE: Record<string, string> = {
  WAITING: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  ENDED: "bg-gray-100 text-gray-400",
};

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${className}`}>
      {text}
    </span>
  );
}

// ──────────────────────────────
// DebugPanel 本体
// ──────────────────────────────
function TabBar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "tables", label: "テーブル" },
    { id: "chime", label: "Amazon Chime" },
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

function ChimePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-gray-600">
      <span className="text-4xl">📡</span>
      <p className="text-sm">Amazon Chime — 準備中</p>
    </div>
  );
}

function DebugPanelInner() {
  const [activeTab, setActiveTab] = useState<Tab>("tables");

  const { data: counselorData, isLoading: loadingCounselors, refetch: refetchCounselors } = useQuery({
    queryKey: ["debug-counselors"],
    queryFn: fetchCounselors,
  });

  const { data: appointmentData, isLoading: loadingAppointments, refetch: refetchAppointments } = useQuery({
    queryKey: ["debug-appointments"],
    queryFn: fetchAppointments,
  });

  const counselors = counselorData?.counselors ?? [];
  const appointments = appointmentData?.appointments ?? [];

  const { mutate: runSeed, isPending: seeding, isSuccess: seedDone, isError: seedFailed, data: seedResult, error: seedError } = useMutation({
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
    <div className="min-h-screen bg-[#0F172A] text-gray-100 font-mono text-sm">

      {/* ヘッダー */}
      <header className="flex items-center justify-between px-8 h-14 bg-[#0F172A] border-b border-[#1E293B]">
        <div className="flex items-center gap-4">
          <span className="text-orange-400 font-bold text-base not-italic">MentalCare</span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-200 font-bold">Debug Panel</span>
          <span className="bg-green-900 text-green-300 text-xs px-2 py-0.5 rounded font-semibold">development</span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-[#334155] rounded px-3 py-1.5 transition-colors"
        >
          ↻ 更新
        </button>
      </header>

      <div className="flex gap-0 h-[calc(100vh-56px)]">

        {/* 左サイドバー: ナビゲーション */}
        <aside className="w-72 border-r border-[#1E293B] p-5 flex flex-col gap-6 overflow-y-auto shrink-0">

          {/* 相談者向け */}
          <section>
            <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-3">相談者向け</p>
            <div className="flex flex-col gap-1">
              <a
                href="/talk/home"
                className="flex items-center justify-between px-3 py-2 rounded-md bg-[#1E293B] hover:bg-[#334155] transition-colors group"
              >
                <span className="text-gray-300 group-hover:text-white">/talk/home</span>
                <span className="text-gray-500 text-xs">バブルUI</span>
              </a>
              {appointments.filter(a => a.status === "WAITING" || a.status === "ACTIVE").map((a) => (
                <a
                  key={a.id}
                  href={`/talk/appointment/${a.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-[#1E293B] hover:bg-[#334155] transition-colors group"
                >
                  <span className="text-gray-300 group-hover:text-white text-xs truncate">/talk/appointment/{a.id.slice(0, 8)}…</span>
                  <Badge text={a.status} className={STATUS_STYLE[a.status]} />
                </a>
              ))}
            </div>
          </section>

          {/* カウンセラー向け */}
          <section>
            <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-3">カウンセラー向け</p>
            {loadingCounselors ? (
              <p className="text-gray-500 text-xs">読み込み中...</p>
            ) : (
              <div className="flex flex-col gap-1">
                {counselors.map((c) => (
                  <div key={c.id} className="flex flex-col gap-0.5">
                    <a
                      href={`/counselor/dashboard/${c.id}`}
                      className="flex items-center justify-between px-3 py-2 rounded-md bg-[#1E293B] hover:bg-[#334155] transition-colors group"
                    >
                      <span className="text-gray-300 group-hover:text-white text-xs truncate">{c.name}</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>

        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto flex flex-col">

          {/* タブ */}
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="p-6 flex flex-col gap-8">
          {activeTab === "tables" && <>

          {/* アクション */}
          <section>
            <h2 className="text-gray-200 font-bold mb-3">アクション</h2>
            <div className="flex items-center gap-3 bg-[#1E293B] rounded-lg p-4">
              <button
                type="button"
                onClick={() => runSeed()}
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
                    {["id", "name", "rating", "specialty", "experienceYears"].map(col => (
                      <th key={col} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingCounselors ? (
                    <tr><td colSpan={5} className="px-3 py-4 text-gray-500 text-center">読み込み中...</td></tr>
                  ) : counselors.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-4 text-gray-500 text-center">データなし — Seed 実行してください</td></tr>
                  ) : (
                    counselors.map((c, i) => (
                      <tr key={c.id} className={i % 2 === 0 ? "bg-[#0F172A]" : "bg-[#111827]"}>
                        <td className="px-3 py-2 text-indigo-300 whitespace-nowrap">{c.id}</td>
                        <td className="px-3 py-2 text-gray-200 whitespace-nowrap">{c.name}</td>
                        <td className="px-3 py-2 text-gray-300">{c.rating ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{c.specialty ?? "—"}</td>
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
              <span className="ml-2 text-gray-500 font-normal text-xs">{appointments.length} items</span>
            </h2>
            <div className="overflow-x-auto rounded-lg border border-[#1E293B]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#1E293B] text-gray-400">
                    {["id", "counselorId", "status", "scheduledStart (JST)", "scheduledEnd (JST)", "createdAt", "endedAt"].map(col => (
                      <th key={col} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingAppointments ? (
                    <tr><td colSpan={7} className="px-3 py-4 text-gray-500 text-center">読み込み中...</td></tr>
                  ) : appointments.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-4 text-gray-500 text-center">データなし</td></tr>
                  ) : (
                    appointments.map((a, i) => (
                      <tr key={a.id} className={i % 2 === 0 ? "bg-[#0F172A]" : "bg-[#111827]"}>
                        <td className="px-3 py-2 text-indigo-300 font-mono whitespace-nowrap">
                          <a href={`/talk/appointment/${a.id}`} className="hover:underline">{a.id.slice(0, 8)}…</a>
                        </td>
                        <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{a.counselorId}</td>
                        <td className="px-3 py-2">
                          <Badge text={a.status} className={STATUS_STYLE[a.status] ?? "bg-gray-100 text-gray-400"} />
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

          </>}

          {activeTab === "chime" && <ChimePlaceholder />}
          </div>

        </main>
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
