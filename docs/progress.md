# mentalcare - 決定事項ログ

最終更新: 2026-03-01

---

## アーキテクチャ

### モノレポ構成（SST v3）
packages/ 以下を core / functions / web に分割。
SST v3 により Lambda・API Gateway・DynamoDB・S3 を単一リポジトリで管理。

### API は GraphQL（graphql-yoga）
gql.tada でスキーマから型を自動生成。フロントエンドは必要なフィールドだけ取得でき型安全。

### フロントエンド: Astro + React Islands
静的部分は Astro、インタラクティブな部分のみ React（`client:load`）。

### リアルタイム同期: ポーリング（TanStack Query）
| 箇所 | 間隔 |
|------|------|
| バブルUI（openAppointments） | 20秒 |
| セッション画面（appointment） | 5秒 |
| カウンセラー待機画面（appointment） | 3秒 |
| カウンセラー予約管理（counselorAppointment） | 5秒 |

MVP では WebSocket 不使用。WebSocket は MVP 後に検討。

### 音声通話: Amazon Chime SDK（WebRTC）予定
現時点では通話UIのみ実装済み。Chime SDK との接続は未実装。

---

## データモデル（2026-03-01 時点）

### CounselorTable

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | String (PK) | カウンセラーID |
| `name` | String | 氏名 |
| `photoKey` | String? | S3キー（`avatars/counselor-1.jpg`）。リゾルバでPresignedURLに変換して返す |
| `rating` | Float? | 平均評価 |
| `specialty` | String? | 専門分野 |
| `experienceYears` | Int? | 経験年数 |
| `updatedAt` | String | 更新日時（ISO8601） |

### AppointmentTable

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | String (PK) | アポイントメントID |
| `counselorId` | String (GSI) | カウンセラーID（`byCounselor` インデックス） |
| `status` | Enum | OPEN / WAITING / ACTIVE / ENDED |
| `scheduledStart` | String | 開始時刻（HH:MM・JST） |
| `scheduledEnd` | String | 終了時刻（HH:MM・JST） |
| `createdAt` | String | 作成日時（ISO8601） |
| `endedAt` | String? | 終了日時（ENDED 時にセット） |
| `ttl` | Number? | Unix秒（endedAt + 60秒、DynamoDB TTL で自動削除）※テスト用、本番は要変更 |

※ 旧 SessionTable は廃止済み。AppointmentTable に統合。

---

## ドメイン設計

### Appointment ステータス遷移

```
OPEN    → カウンセラーが予約管理で枠を作成
WAITING → カウンセラーが「待機する」を押して入室
ACTIVE  → 相談者がバブルから選んで入室（両者揃った）
ENDED   → どちらかが「通話終了」を押した
```

- `joinAppointment(appointmentId)` 1本で両パターンを処理
  - status が OPEN → WAITING に更新（カウンセラーが先に入室）
  - status が WAITING → ACTIVE に更新（相談者が入室）
- 楽観的排他制御（DynamoDB ConditionalExpression）で二重入室を防止

### CounselorAvailability（時間ベースの算出値）

`calculateAvailability(scheduledStart, scheduledEnd)` で動的に算出。AppointmentStatus とは独立。

| 値 | 条件 |
|----|------|
| AVAILABLE | 現在が scheduledStart〜scheduledEnd の間 |
| SOON | 開始まで30分以内 |
| LATER | 開始まで60分以内 |
| OFFLINE | それ以外 |

### S3 写真: PresignedURL 方式

バケット非公開。DynamoDB には `photoKey`（S3キー）のみ保存。
`Counselor.photoUrl` フィールドリゾルバでリクエスト時に PresignedURL（有効期限1時間）を生成して返す。

---

## 画面・コンポーネント構成（2026-03-01 時点）

### ページ一覧

| URL | ファイル | 説明 |
|-----|---------|------|
| `/` | `pages/index.astro` | `/debug` へリダイレクト |
| `/debug` | `pages/debug.astro` | 開発用デバッグ画面 |
| `/talk/home` | `pages/talk/home.astro` | バブルUI |
| `/talk/appointment/[id]` | `pages/talk/appointment/[id].astro` | 相談者セッション画面 |
| `/talk/appointment/[id]/end` | `pages/talk/appointment/[id]/end.astro` | セッション終了画面 |
| `/counselor/[id]/appointment` | `pages/counselor/[id]/appointment/index.astro` | カウンセラー予約管理 |
| `/counselor/appointment/[id]` | `pages/counselor/appointment/[id].astro` | カウンセラーセッション画面 |
| `/counselor/list` | `pages/counselor/list.astro` | カウンセラー一覧（管理用） |

### バブルUI 表示ルール（BubbleCanvas.tsx）

| AppointmentStatus | CounselorAvailability | 表示 | クリック |
|-------------------|-----------------------|------|---------|
| WAITING | — | ● 待機中（緑） | ✅ |
| OPEN | AVAILABLE / SOON / LATER | ● 今すぐ可 / ◎ 15分後〜 / ◎ 30分後〜 | ✅ |
| ACTIVE | — | ● 通話中（グレーアウト） | ❌ |
| OPEN | OFFLINE | ● オフライン（グレーアウト） | ❌ |
| ENDED | — | 非表示 | — |

### カウンセラー予約管理 状態マトリクス（CounselorAppointmentManager.tsx）

| AppointmentStatus | 相談者の状態テキスト | ボタン | ボタン動作 |
|-------------------|---------------------|--------|-----------|
| なし / OPEN | まだ接続していません | 待機する（indigo） | joinAppointment → /counselor/appointment/[id] |
| WAITING | 相談者が待機中です | 接続する（緑） | joinAppointment → /counselor/appointment/[id] |
| ACTIVE | 相談中です | 通話に戻る（緑） | /counselor/appointment/[id] へ直接遷移 |

---

## GraphQL スキーマ（現在）

### Query
| 名前 | 用途 |
|------|------|
| `openAppointments` | バブルUI用（ENDED 以外を全件返す） |
| `appointment(id)` | セッション画面でポーリング |
| `appointments` | デバッグ用全件取得 |
| `counselorAppointment(counselorId)` | カウンセラー予約管理用 |
| `counselors` | カウンセラー一覧・管理用 |
| `counselor(id)` | カウンセラー単体取得 |
| `counselorStats` | 統計（total のみ） |

### Mutation
| 名前 | 用途 |
|------|------|
| `createAppointment` | カウンセラーが予定枠を作成・更新 |
| `joinAppointment` | 入室（OPEN→WAITING / WAITING→ACTIVE） |
| `endAppointment` | 通話終了（ENDED + TTL セット） |
| `seedDatabase` | テストデータ投入（開発用） |

---

## 開発環境

### デバッグページ: `/debug`

- 全カウンセラーの状態確認
- 全アポイントメントの状態確認
- Seed ボタン（テストデータ投入）
- 各画面へのクイックリンク（counselor-1〜7）

---

## MVP スコープ外（理由）

| 機能 | 理由 |
|------|------|
| 評価システム | セッション数が少ないうちはデータが意味を持たない |
| カウンセラー審査 | まず動くものを出してから品質管理を考える |
| 緊急時フロー | 専門知識が必要。MVP後に設計 |
| 料金・決済 | まず使われるかを確認してから有料化 |
| ビデオ通話 | 音声で十分か検証してから追加 |
| フィルター検索 | カウンセラー数が少ないうちは不要 |
| チャット | 音声のみで先行リリース |
| 認証 | MVP は URL パラメータで counselorId を渡す |

---

## 機能レビュー記録

### 相談者側 ① `/talk/home` — バブルUI

**ファイル**
- `packages/web/src/pages/talk/home.astro` — ページ（ヘッダー静的部分）
- `packages/web/src/components/talk/BubbleCanvas.tsx` — バブル部分（React Island）

**動作**
1. ページを開くと `openAppointments` クエリを20秒ごとにポーリング
2. アポイントメントを持つカウンセラーがバブルとして表示される
3. バブルのサイズは `rating`（評価）に比例、ドラッグで移動可能
4. クリックすると確認ダイアログ表示
5. 「相談を始める」→ `joinAppointment` mutation → `/talk/appointment/[id]` へ遷移

**AppointmentStatus の定義（バブル表示との対応）**

| status | 意味 | 表示 | クリック |
|--------|------|------|---------|
| `OPEN` | カウンセラーが枠を作成済み・未入室 | 時刻ベースのラベル（下記） | 時刻による |
| `WAITING` | カウンセラーが「待機する」を押して入室済み | ● 待機中（緑） | ✅ |
| `ACTIVE` | 相談者も入室、通話中 | ● 通話中（グレー） | ❌ |
| `ENDED` | 通話終了 | 非表示 | — |

**OPEN の時刻ベースラベル（CounselorAvailability）**

| 条件 | ラベル | クリック |
|------|--------|---------|
| 現在時刻が scheduledStart〜scheduledEnd の間 | ● 今すぐ可（緑） | ✅ |
| 開始まで30分以内 | ◎ 15分後〜（黄） | ✅ |
| 開始まで60分以内 | ◎ 30分後〜（黄） | ✅ |
| それ以外 | ● オフライン（グレー） | ❌ |

---

## レビュー中の未確認事項

### ① `counselorStats` の将来計画
現在は `{ total: Int! }` のみ返す。「本日対応可能数」など追加するか未確認。

### ② Chime SDK 実装
通話UIは完成。Amazon Chime SDK との接続が未実装。実装タイミング未定。

### ③ TTL の本番値
現在 `endedAt + 60秒`（テスト用）。本番では何時間にするか未確認。

### ④ 認証
MVP は認証なし。counselorId を URL パラメータで渡している。本番前に要検討。
