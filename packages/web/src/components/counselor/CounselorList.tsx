import { useQuery } from "@tanstack/react-query";
import { QueryProvider } from "../QueryProvider";
import { fetchAvailableCounselors } from "../../graphql/counselor";

const AVAILABILITY_LABEL = {
  AVAILABLE: "● 今すぐ可",
  SOON: "◎ 15分後〜",
  LATER: "◎ 30分後〜",
  OFFLINE: "オフライン",
} as const;

function CounselorListInner() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["counselors", "available"],
    queryFn: fetchAvailableCounselors,
    refetchInterval: 20_000,
  });

  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p>エラーが発生しました</p>;

  const counselors = data?.availableCounselors ?? [];

  if (counselors.length === 0) return <p>現在対応できるカウンセラーがいません</p>;

  return (
    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
      {counselors.map((c) => (
        <li
          key={c.id}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "15px" }}>{c.name}</div>
            <div style={{ fontSize: "13px", color: c.availability === "AVAILABLE" ? "#16a34a" : "#f59e0b", marginTop: "4px" }}>
              {AVAILABILITY_LABEL[c.availability]}
            </div>
          </div>
          {c.rating && (
            <div style={{ fontSize: "13px", color: "#6b7280" }}>★ {c.rating}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function CounselorList() {
  return (
    <QueryProvider>
      <CounselorListInner />
    </QueryProvider>
  );
}
