import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { QueryProvider } from "../QueryProvider";
import { fetchCounselors } from "../../graphql/counselor";

type Availability = "AVAILABLE" | "SOON" | "LATER" | "OFFLINE";

const SPECIALTIES = ["すべて", "ストレス・不安", "対人関係", "職場・キャリア"] as const;

const SPECIALTY_FILTER_MAP: Record<string, string[]> = {
  "ストレス・不安": ["ストレス・不安"],
  "対人関係": ["対人関係・人間関係"],
  "職場・キャリア": ["職場環境・キャリア"],
};

function statusLabel(availability: Availability) {
  switch (availability) {
    case "AVAILABLE":
      return { text: "対応中", className: "bg-orange-100 text-orange-700" };
    case "SOON":
    case "LATER":
      return { text: "予約可能", className: "bg-green-100 text-green-700" };
    case "OFFLINE":
      return { text: "オフライン", className: "bg-gray-100 text-gray-500" };
  }
}

function CounselorListInner() {
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("すべて");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const { data, isLoading, error } = useQuery({
    queryKey: ["counselors"],
    queryFn: fetchCounselors,
    refetchInterval: 20_000,
  });

  const counselors = data?.counselors ?? [];
  const stats = data?.counselorStats;

  const filtered = counselors.filter((c) => {
    const matchSearch =
      search === "" ||
      c.name.includes(search) ||
      (c.specialty ?? "").includes(search);

    const matchSpecialty =
      selectedSpecialty === "すべて" ||
      (SPECIALTY_FILTER_MAP[selectedSpecialty] ?? []).some((s) =>
        (c.specialty ?? "").includes(s),
      );

    return matchSearch && matchSpecialty;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        エラーが発生しました
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">登録カウンセラー</p>
          <p className="text-4xl font-bold mt-2">{stats?.total ?? "-"}名</p>
          <p className="text-xs text-green-600 mt-1">今月 +3名</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">今日対応可能</p>
          <p className="text-4xl font-bold mt-2">{stats?.availableToday ?? "-"}名</p>
          <p className="text-xs text-gray-400 mt-1">通常稼働中</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">今月の予約数</p>
          <p className="text-4xl font-bold mt-2">142件</p>
          <p className="text-xs text-green-600 mt-1">先月比 +12%</p>
        </div>
      </div>

      {/* テーブルカード */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 検索・フィルター */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-400 w-56"
          />
          <div className="flex gap-2">
            {SPECIALTIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setSelectedSpecialty(s); setPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedSpecialty === s
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* テーブル */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500 w-52">カウンセラー名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">専門分野</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">経験年数</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">料金/50分</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">ステータス</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  該当するカウンセラーがいません
                </td>
              </tr>
            ) : (
              paginated.map((c) => {
                const status = statusLabel(c.availability as Availability);
                return (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {c.photoUrl ? (
                          <img
                            src={c.photoUrl}
                            alt={c.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                            {c.name[0]}
                          </div>
                        )}
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700">{c.specialty ?? "—"}</td>
                    <td className="px-4 py-3.5 text-gray-700">{c.experienceYears != null ? `${c.experienceYears}年` : "—"}</td>
                    <td className="px-4 py-3.5 text-gray-700">{c.feePerSession != null ? `¥${c.feePerSession.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.availability !== "OFFLINE" ? (
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-md transition-colors"
                        >
                          予約
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="px-3 py-1.5 border border-gray-300 text-gray-500 text-xs font-medium rounded-md"
                        >
                          詳細
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ページネーション */}
        <div className="flex items-center justify-between px-5 py-3">
          <p className="text-sm text-gray-500">
            {filtered.length}件中 {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}〜{Math.min(page * PAGE_SIZE, filtered.length)}件を表示
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`w-8 h-8 text-sm rounded-md ${
                  p === page
                    ? "bg-orange-500 text-white"
                    : "border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CounselorList() {
  return (
    <QueryProvider>
      <CounselorListInner />
    </QueryProvider>
  );
}
