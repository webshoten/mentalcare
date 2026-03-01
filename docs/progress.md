# mentalcare - 決定事項ログ

最終更新: 2026-03-01

---

## アーキテクチャ

### モノレポ構成（SST v3）
packages/ 以下を core / functions / types / web に分割。
SST v3 により Lambda・API Gateway・DynamoDB を単一リポジトリで管理する。
→ インフラとアプリを同一リポジトリで一貫して扱えるため。

### API は GraphQL（graphql-yoga）
REST ではなく GraphQL を採用。gql.tada でスキーマから型を自動生成。
→ フロントエンドが必要なフィールドだけ取得でき、型安全性も担保できるため。

### フロントエンド: Astro + React Islands
静的部分は Astro、インタラクティブな部分（カウンセラー一覧・セッション画面など）のみ React。
→ 不要な JS を削減しつつ、必要な箇所だけ React の柔軟性を使える。

### リアルタイム同期: ポーリング（TanStack Query）
カウンセラーの在席状態は 20 秒ごとのポーリングで取得。
→ MVP では WebSocket の複雑さを避ける。十分な体験が得られるならポーリングで済ませる。WebSocket は MVP 後に検討。

### 音声通話: Amazon Chime SDK（WebRTC）
→ AWS エコシステム内で完結でき、1対1音声の料金も安い（30分 $0.10 程度）。

---

## データモデル

### テーブル構成（2026-03-01 時点）

#### CounselorTable
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | String (PK) | カウンセラーID |
| `name` | String | 氏名 |
| `photoKey` | String | S3キー（PresignedURL で返す） |
| `rating` | Float | 平均評価 |
| `specialty` | String | 専門分野 |
| `experienceYears` | Number | 経験年数 |
| `updatedAt` | String | 更新日時（ISO8601） |

※ `scheduledStart` / `scheduledEnd` / `availability` は **AppointmentTable に移行予定**。

#### AppointmentTable（設計中・実装予定）
カウンセラーが予約枠を作成し、相談者がそれを予約する。予約枠がそのままセッションになる。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | String (PK) | アポイントメントID |
| `counselorId` | String (GSI) | カウンセラーID |
| `status` | Enum | OPEN / WAITING / ACTIVE / ENDED |
| `scheduledStart` | String | 開始時刻（HH:MM・JST） |
| `scheduledEnd` | String | 終了時刻（HH:MM・JST） |
| `createdAt` | String | 作成日時（ISO8601） |
| `endedAt` | String? | 終了日時（ENDED 時にセット） |
| `ttl` | Number? | Unix秒（endedAt + 1時間、DynamoDB TTL） |

**ステータス遷移:**
```
カウンセラーが枠作成 → OPEN
相談者が予約        → WAITING
通話開始            → ACTIVE
通話終了            → ENDED（ttl セット → 1時間後に自動削除）
```

**旧 SessionTable は AppointmentTable に統合・廃止予定。**

---

### カウンセラーの状態: 4段階 enum
AVAILABLE（今すぐ） / SOON（15分後〜） / LATER（30分後〜） / OFFLINE（非表示）
→ Appointment の `scheduledStart/scheduledEnd` から動的に算出。OFFLINE はバブル画面に表示しない。

---

## UX・プロダクト

### マッチング方式: 指名 + 即時接続の2通り
カウンセラーを自分で選ぶ「指名選択」と、空いている人に自動接続する「今すぐ話す」を併設。
→ 「誰でもいいからとにかく話したい」と「この人に話したい」の両ニーズに対応するため。

### セッションロック: 楽観的排他制御
「相談を始める」押下時に DB でカウンセラーをロック。先着1名のみ成功、後続はエラー。
ロック済みカウンセラーは他の相談者のバブルから削除（グレーアウトではなく非表示）。
→ 二重予約を防ぎつつ、使えないバブルをUIに残してストレスを与えない。

### バブルUI: Canvas + Web Worker + D3 force simulation
カウンセラー一覧をバブル（円）で表示。D3 force simulation で自然な動き。
描画・物理演算は OffscreenCanvas + Web Worker 内で完結。
→ メインスレッドをブロックせず、アニメーションがスムーズに動くため。

---

## カウンセラー一覧画面（2026-02-28）

### スタイリング: Tailwind CSS v4（@tailwindcss/vite）
Astro + React のプロジェクトに Tailwind v4 を導入。`@tailwindcss/vite` プラグイン経由で設定。
→ デザインとの親和性が高く、細かい調整がしやすいため。

### カウンセラー写真: S3（パブリック公開バケット）
`sst.aws.Bucket` で `access: "public"` のバケットを作成。seed 時に randomuser.me から取得した画像をアップロードし、DynamoDB の `photoUrl` に S3 URL を保存。
→ 外部URLに依存せず、本番と同じ構成でローカル開発できるため。

### Counselor 型に追加したフィールド
`specialty`（専門分野）、`experienceYears`（経験年数）、`feePerSession`（料金/50分）を GraphQL スキーマと DynamoDB に追加。
→ カウンセラー一覧のテーブル表示に必要な情報として追加。

### 追加した GraphQL クエリ
- `counselors` — 全カウンセラー取得（一覧画面用）
- `counselorStats` — 統計（total, availableToday）→ 既存の `availableCounselors` は OFFLINE 除外のバブル画面用として維持。

### ステータス表示の対応
- AVAILABLE → 「対応中」（オレンジ）
- SOON / LATER → 「予約可能」（グリーン）
- OFFLINE → 「オフライン」（グレー）

### ページ構成: サイドバー + メインコンテンツ
`counselors.astro` にサイドバーを組み込み、`CounselorList.tsx` を React Island として `client:load` でマウント。
→ サイドバーは静的なので Astro で描画、インタラクティブな一覧部分のみ React にすることで JS を最小化。

---

## セッション機能（2026-03-01）

### MVP は音声のみ（チャットなし）
チャット機能は MVP スコープ外。通話のみに絞る。
→ シンプルに動くものを先に出す。チャットは MVP 後に検討。

### セッション画面: 単一ページでの状態切り替え
`/talk/session/[id]` 内でコンポーネントを切り替える（waiting → connected）。別ルートへの遷移なし。
→ 画面遷移よりも自然な体験になるため。

### 接続モック: 3秒タイマー
Chime SDK 未実装のため、セッション開始から3秒後に自動で「通話中」状態に切り替えるモックを実装。
→ UI を先に完成させ、SDK は後から差し込む。

### カウンセラー可用性: スケジュール自動算出
手動のオンライン切替ではなく、`scheduledStart` / `scheduledEnd`（HH:MM形式・UTC）を DynamoDB に保存し、`calculateAvailability()` でリクエスト時に動的に算出。
- AVAILABLE: 現在が開始〜終了時刻の間
- SOON: 開始まで30分以内
- LATER: 開始まで60分以内
- OFFLINE: それ以外

### タイムゾーン統一: UTC
seed スクリプト（`hhmm()`）と `calculateAvailability()` の両方で UTC を使用。Lambda が UTC で動作するため。

### S3 写真: PresignedURL 方式
バケットを非公開に変更。DynamoDB には S3 キー（`photoKey`）のみ保存。
GraphQL リゾルバ（`Counselor.photoUrl`）でリクエスト時に PresignedURL（有効期限1時間）を発行して返す。

### GraphQL スキーマ追加（セッション関連）
| 追加 | 種別 | 用途 |
|------|------|------|
| `Session` 型 | Type | id / counselorId / status / createdAt / endedAt |
| `SessionStatus` | Enum | WAITING / ACTIVE / ENDED |
| `startSession(counselorId)` | Mutation | セッション開始 |
| `endSession(sessionId)` | Mutation | 通話終了 |
| `session(id)` | Query | セッション取得 |
| `sessions` | Query | 全セッション取得（デバッグ用） |
| `pendingSession(counselorId)` | Query | カウンセラー待機中セッション取得 |
| `setSchedule(counselorId, start, end)` | Mutation | 勤務スケジュール設定 |
| `counselor(id)` | Query | カウンセラー単体取得 |

### DynamoDB テーブル追加
- `SessionTable`: hashKey=id、GSI `byCounselor`（hashKey=counselorId）でカウンセラー別セッション検索に対応

---

## カウンセラー向け画面（2026-03-01）

### ダッシュボード: `/counselor/dashboard/[id]`
- 「本日の予定」カード: 開始・終了時刻の入力フォーム（`setSchedule` mutation）
- 「確定した予定」カード: 現在のスケジュールと availability 表示 + 待機する/接続するボタン
- カウンセラー ID は URL パラメータで渡す（MVP: 認証なし）
- 相談者が WAITING セッションを持っている場合「接続する」ボタンに変化（`pendingSession` 5秒ポーリング）

### カウンセラー側セッション画面: `/counselor/session/[id]`
- 相談者を匿名（「相談者」アイコン）で表示
- 待機状態: `session` クエリを3秒ポーリングし、ACTIVE になったら通話中に切り替え
- 通話中: クライアント側と同じコントロール（ミュート・通話終了・スピーカー）
- 通話終了 → `/counselor/dashboard` に戻る

---

## 開発体験（2026-03-01）

### デバッグページ: `/debug`
開発用のデバッグ画面。`/` ルートがリダイレクト先になっている。
- **左サイドバー**: 実 URL ナビゲーション（相談者向け・カウンセラー向け）。counselor-1〜7 の実リンクと availability バッジ。WAITING/ACTIVE セッションへのリンクも自動表示。
- **右メイン（上から順）**:
  1. アクション（Seed 実行コマンドのコピー）
  2. CounselorTable の全データ（id / name / availability / scheduledStart / scheduledEnd / rating / sessionCount / specialty）
  3. SessionTable の全データ（id / counselorId / status / createdAt / endedAt）

### ワークフロールール（CLAUDE.md に記載）
実装前に必ず「計画 → Pencil デザイン → 計画再確認 → 実装」の順を守る。

---

## MVP スコープの境界

### MVP に含めないもの（理由）
- 評価システム → セッション数が少ないうちはデータが意味を持たない
- カウンセラー審査 → まず動くものを出してから品質管理を考える
- 緊急時フロー（自殺念慮など） → 専門知識が必要。MVP後に設計する
- 料金・決済 → まず使われるかを確認してから有料化を検討
- ビデオ通話 → 音声で十分か検証してから追加する
- フィルター検索 → カウンセラー数が少ないうちは不要
