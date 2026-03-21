# CLAUDE.md

## 日報（docs/journal/）
- **セッション開始時**: `docs/journal/` の最新ファイルを読み、前回のサマリーから状況を把握してから作業を始める
- **作業中**: 時系列で書き殴る。合意事項・調査結果・決定・疑問など、何でも都度追記する。体裁は気にしない
- **セッション終了時**: 末尾に `## サマリー` を書く。次回セッションの自分が読んで状況把握できる内容にする
- ファイル名は `YYYY-MM-DD.md` 形式。当日のファイルがなければ新規作成する

## 進め方

### 必須ワークフロー（この順番を厳守）

1. **計画** — 何をするかをユーザーと言語で合意する
2. **Pencil デザイン** — 合意した内容を Pencil で画面デザインとして具体化する
3. **計画の再確認** — デザインを見てユーザーが実装内容を最終承認する
4. **実装** — 承認を得てから初めてコードを書く

**ルール:**
- プランや設計書を受け取っただけでは実装の承認ではない
- Pencil デザインの作成依頼は、実装の承認ではない
- ユーザーが「実装してください」「作成お願いします」と明示した場合のみ実装に進む
- 迷ったら実装を止めてユーザーに確認する
- **実装に入る前に「実装していいですか？」と確認し、OK を得てから手を動かす**
- **「このように書きますがよろしいですか？」とユーザーに確認する形で実装確認を行う**

---

## アーキテクチャ・技術スタック

### モノレポ（SST v3）
```
packages/
  core/       ドメインロジック
  functions/  Lambda ハンドラ・GraphQL リゾルバ
  web/        フロントエンド（Astro）
```
インフラ（Lambda / API Gateway / DynamoDB / S3）は SST v3 で管理。

### バックエンド
- GraphQL（graphql-yoga）
- gql.tada でスキーマ→型を自動生成
- DynamoDB（AWS SDK v3）

### フロントエンド
- Astro + React Islands（静的部分は Astro、インタラクティブ部分のみ React）
- Tailwind CSS v4（@tailwindcss/vite）
- TanStack Query（20秒ポーリング、MVP では WebSocket 不使用）

### 音声通話
- Amazon Chime SDK（WebRTC）

---

## ドメイン（境界づけられたコンテキスト）

### 相談者コンテキスト（`/talk/`）
相談を求めるユーザー。カウンセラーを選び、セッションを開始する。

| URL | 画面 |
|-----|------|
| `/talk/home` | バブルUI — 今すぐ話せるカウンセラー一覧 |
| `/talk/appointment/[id]` | セッション画面（音声） |
| `/talk/appointment/[id]/end` | セッション終了・評価 |

### カウンセラーコンテキスト（`/counselor/`）
カウンセリングを提供するユーザー。待機状態を管理し、セッションを受ける。

| URL | 画面 |
|-----|------|
| `/counselor/[id]/appointment` | 予約管理（待機枠の作成・待機開始） |
| `/counselor/profile` | プロフィール設定 |
| `/counselor/appointment/[id]` | セッション画面 |

---

## 現在の実装状態（2026-02-28）

### ページ

| URL | ファイル | 状態 | 備考 |
|-----|---------|------|------|
| `/` | `pages/index.astro` | 仮 | `<h1>MentalCare</h1>` のみ |
| `/talk/home` | `pages/talk/home.astro` | 実装済み | バブルUI + 確認ダイアログ |
| `/talk/session/[id]` | `pages/talk/session/[id].astro` | スケルトン | セッション画面（未実装） |
| `/counselor/list` | `pages/counselor/list.astro` | 存続 | カウンセラー一覧テーブルUI |

### コンポーネント

| ファイル | 状態 | 備考 |
|---------|------|------|
| `components/counselor/CounselorList.tsx` | 存続 | `/counselor/list` 用テーブルUI |
| `components/talk/BubbleCanvas.tsx` | 実装済み | バブルUI + 確認ダイアログ（React Island） |
| `components/QueryProvider.tsx` | 存続 | TanStack Query の Provider |
| `components/Nav.astro` | 存続 | ナビゲーション |

### GraphQL クエリ（`src/graphql/counselor.ts`）

| クエリ | 用途 |
|--------|------|
| `availableCounselors` | OFFLINE を除いたカウンセラー取得（バブルUI用） |
| `counselors` | 全カウンセラー取得（削除予定の管理画面用だが、フィールドはバブルUIでも使う） |
| `counselorStats` | 統計（total, availableToday） |

### Counselor の主なフィールド
`id` / `name` / `photoUrl` / `availability` / `availableAt` / `rating` / `specialty` / `experienceYears`

---

### セッションコンテキスト（共通）
セッションロックは楽観的排他制御。先着1名のみ成功、ロック済みカウンセラーはバブルから非表示。

### Appointment ステータス遷移
```
OPEN    → カウンセラーが枠を作成
WAITING → カウンセラーが待機画面へ入室
ACTIVE  → 相談者が入室（両者揃った）
ENDED   → 通話終了
```
- カウンセラーが先に待機画面へ → WAITING、相談者がバブルから選ぶ → ACTIVE
- `joinAppointment(appointmentId)` mutation 1本で処理
  - status が OPEN → WAITING に更新
  - status が WAITING → ACTIVE に更新

### カウンセラー予約管理（`/counselor/[id]/appointment`）の状態マトリクス

| AppointmentStatus | 相談者の状態テキスト | ボタン | ボタン動作 |
|-------------------|---------------------|--------|-----------|
| OPEN | まだ接続していません | 待機する（indigo） | joinAppointment → /counselor/appointment/[id] |
| WAITING | 相談者が待機中です | 接続する（緑） | joinAppointment → /counselor/appointment/[id] |
| ACTIVE | 相談中です | 通話に戻る（緑） | /counselor/appointment/[id] へ直接遷移 |

### カウンセラーの可用性（CounselorAvailability）
`AVAILABLE`（今すぐ）/ `SOON`（15分後〜）/ `LATER`（30分後〜）/ `OFFLINE`（バブル非表示）
※ Appointment の scheduledStart/scheduledEnd から動的に算出。AppointmentStatus とは別物。

---

## 対応が必要な課題

### S3 パブリックバケット問題（優先度：高）

**現状の問題**
- `CounselorPhotoBucket` が `access: "public"` でURLを知っていれば誰でもアクセスできる
- `photoUrl` は `https://{bucket}.s3.{region}.amazonaws.com/{key}` の公開URL
- MVPの今は問題が顕在化しにくいが、本番では不適切

**対応方針（合意済み）**
- バケットを非公開（`access: "public"` を削除）に変更
- `photoUrl` としてDynamoDBに保存するのはS3のキー（`avatars/counselor-1.jpg`）のみ
- フロントが画像を必要とするとき、バックエンド経由でPresignedURLを発行して返す
- GraphQLリゾルバの `photoUrl` フィールドをS3キー→PresignedURL変換に変更

**変更が必要なファイル**
- `sst.config.ts` — `access: "public"` 削除
- `packages/scripts/seed.ts` — S3公開URLではなくキーを保存するよう変更
- `packages/functions/src/counselor/resolver.ts` — `photoUrl` フィールドでPresignedURL生成
- `packages/core/src/counselor/index.ts` — DynamoDBのphotoUrlフィールドをkeyとして扱う

---

## 次の実装（合意済み）

### `/talk/home` バブルUI

**作成するファイル**
- `packages/web/src/pages/talk/home.astro`
- `packages/web/src/components/talk/BubbleCanvas.tsx`

**技術方針**
- バブル浮遊：CSS keyframes + absolute positioning（新規依存なし）
- バブルサイズ：`rating` 比例
- データ取得：`availableCounselors` クエリ（TanStack Query、20秒ポーリング）

**スコープ**
- ヘッダー（Astro 静的）：ロゴ・ナビ・アバター
- バブルエリア：写真 + 名前 + ステータス（今すぐ可 / 15分後〜 / 30分後〜）
- 確認ダイアログ：写真 / 名前 / 評価 / 「相談を始める」ボタン
- 「相談を始める」→ `/talk/session/[id]` へ遷移（ページはスケルトンのみ）

**スコープ外（今回）**
- フィルターチップ
