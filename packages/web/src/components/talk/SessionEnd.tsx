import { useQuery } from "@tanstack/react-query";
import { fetchSession } from "../../graphql/session";
import { QueryProvider } from "../QueryProvider";

type Props = {
  sessionId: string;
};

function SessionEndInner({ sessionId }: Props) {
  const { data } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => fetchSession(sessionId),
  });

  const counselor = data?.session?.counselor;
  const counselorName = counselor?.name ?? "カウンセラー";
  const photoUrl = counselor?.photoUrl;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-10">
        <span className="text-indigo-500 font-bold text-lg">MentalCare</span>
      </header>

      {/* コンテンツ */}
      <div className="flex-1 flex flex-col items-center pt-14 gap-7">
        {/* 完了アイコン */}
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h1 className="text-gray-900 text-2xl font-bold">お疲れさまでした</h1>

        {/* カウンセラーサマリーカード */}
        <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-6 py-4">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-orange-100">
            {photoUrl ? (
              <img src={photoUrl} alt={counselorName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-orange-600 text-xl font-bold">
                {counselorName[0]}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-900 font-semibold">{counselorName}</span>
            <span className="text-gray-400 text-xs">
              {counselor?.specialty ?? "カウンセラー"}
            </span>
          </div>
        </div>

        {/* ボタン */}
        <a
          href="/talk/home"
          className="w-80 h-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium flex items-center justify-center transition-colors mt-2"
        >
          ホームに戻る
        </a>
      </div>
    </div>
  );
}

export function SessionEnd({ sessionId }: Props) {
  return (
    <QueryProvider>
      <SessionEndInner sessionId={sessionId} />
    </QueryProvider>
  );
}
