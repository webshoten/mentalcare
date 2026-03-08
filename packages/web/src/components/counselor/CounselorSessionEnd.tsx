type Props = {
  counselorId: string;
  reason: "self" | "remote";
};

export function CounselorSessionEnd({ counselorId, reason }: Props) {
  const isSelf = reason === "self";

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-10">
        <span className="text-orange-500 font-bold text-lg">MentalCare</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-7 px-8">
        {/* アイコン */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isSelf ? "bg-green-50" : "bg-orange-50"
          }`}
        >
          {isSelf ? (
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75L18 6m0 0l2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25M3 3l1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17.25 4.5 21V8.742m.164-4.078a6 6 0 0115.672 0M4.664 4.664L19.5 19.5" />
            </svg>
          )}
        </div>

        {/* メッセージ */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-gray-900 text-2xl font-bold">
            {isSelf ? "セッションを終了しました" : "相談者がセッションを終了しました"}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {isSelf
              ? "お疲れさまでした。\n本日も相談者に寄り添っていただきありがとうございます。"
              : "お疲れさまでした。\n予約管理に戻り、次の相談を受け付けましょう。"}
          </p>
        </div>

        {/* ボタン */}
        <a
          href={`/counselor/${counselorId}/appointment`}
          className="w-72 h-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center justify-center transition-colors mt-2"
        >
          予約管理に戻る
        </a>
      </div>
    </div>
  );
}
