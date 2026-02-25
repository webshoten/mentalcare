# mentalcare - 技術スタック詳細

## 全体構成

| レイヤー | 技術 | 補足 |
|---------|------|------|
| フロントエンド | Astro + React Islands | インタラクティブな部分のみ React |
| バックエンド | SST v3 + AWS Lambda (TypeScript) | |
| API | GraphQL (graphql-yoga) + gql.tada | 型安全なスキーマ駆動開発 |
| 認証 | Google OAuth / 匿名ログイン | |
| DB | DynamoDB | |
| 音声通話 | Amazon Chime SDK (WebRTC) | 音声のみ（ビデオはMVP後） |
| リアルタイム同期 | ポーリング（TanStack Query） | WebSocket はMVP後に検討 |
| インフラ | AWS (API Gateway V2) | SST で管理 |
| Linter / Formatter | Biome | |

---

## カウンセラーバブル表示

### 方針
- HTML Canvas（OffscreenCanvas + Web Worker）で描画
- D3 force simulation で自然な動きを実現
- メインスレッドをブロックしないため描画・物理演算は Worker 内で完結

### アーキテクチャ

```
メインスレッド (React)              Web Worker
──────────────────                  ──────────
<canvas> をレンダリング             D3 force simulation
        │                                   │
        │── transferControlToOffscreen ─→   OffscreenCanvas に描画
        │── postMessage(counselors) ──────→  バブル追加 / 削除
        │── postMessage({type:"click",x,y}) → 当たり判定
        │←── postMessage({type:"hit", id}) ─ ダイアログ表示へ
```

### D3 force 設定

```ts
forceSimulation(nodes)
  .force('charge', forceManyBody().strength(5))       // バブル間の反発
  .force('center', forceCenter(width / 2, height / 2)) // 中心への引力
  .force('collision', forceCollide(d => d.radius + 8)) // 重なり防止
  .on('tick', draw)
```

### ポーリング

```ts
useQuery({
  queryKey: ['counselors', 'available'],
  queryFn: fetchAvailableCounselors,
  refetchInterval: 20_000, // 20秒ごとに更新
})
```

---

## セッション管理・ロック

### 方針
- 「相談を始める」押下時に DB でカウンセラーをロック
- 競合対策として**楽観的ロック**（先着1名のみ成功、後からの場合はエラーを返す）
- ロック済みのカウンセラーは他の相談者のバブル画面から**非表示**（グレーアウトではなく削除）

### セッション状態遷移

```
idle（待機中）
  └─ locked（相談者がロック）
        ├─ waiting（カウンセラーが準備中 / 15〜30分後対応）
        └─ active（通話中）
              └─ ended（終了 → idle に戻る）
```

### 相談者のリダイレクト
- アクティブなセッションがある相談者がバブル画面にアクセスした場合 → 待機画面 or 通話画面へリダイレクト
- バブル画面への遷移はセッションなし時のみ許可

---

## 音声通話（Amazon Chime SDK）

- 1対1の音声通話
- セッション作成時に Lambda 側で Chime Meeting + Attendee を生成
- クライアントは SDK を通じて参加
- ビデオはMVP後に検討

### 料金目安

| セッション時間 | 1回 | 月100回 | 月1,000回 |
|-------------|-----|--------|----------|
| 30分 | $0.10（約15円） | $10 | $102 |
| 60分 | $0.20（約30円） | $20 | $204 |

---

## 画面フロー（相談者）

```
バブル画面（U-01）
  └─ バブルをクリック
        └─ 確認ダイアログ（案3）
              └─「相談を始める」
                    ├─ 今すぐ可 ─────→ 通話画面（案5）
                    └─ 15〜30分後〜 → 待機画面（案4）→ 通話画面（案5）
                                                              └─ 終了
                                                                    └─ 評価画面（案6）
```

---

## 将来検討（MVP後）

- リアルタイム同期を **AWS IoT Core**（MQTT over WebSocket）に移行
- ビデオ通話（Chime SDK）
- カウンセラー評価の公開表示
- 専門分野・言語でのフィルター
- 「今すぐ話す」自動マッチング
- 決済機能
