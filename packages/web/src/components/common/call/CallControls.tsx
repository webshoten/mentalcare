type Props = {
  muted: boolean;
  onToggleMute: () => void;
  onEnd: () => void;
  onToggleSpeaker: () => void;
};

export function CallControls({ muted, onToggleMute, onEnd, onToggleSpeaker }: Props) {
  return (
    <div className="flex items-end gap-8">
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onToggleMute}
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
          onClick={onEnd}
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
          onClick={onToggleSpeaker}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
            !muted ? "bg-gray-700 text-white" : "bg-white text-gray-900"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
        </button>
        <span className="text-gray-400 text-xs">スピーカー</span>
      </div>
    </div>
  );
}
