# mentalcare

Mental health counseling matching platform — connect with a counselor instantly.

## 概要

メンタルが病みやすい現代社会において、**すばやく・親身に**相談できる場を提供するメンタルカウンセリングマッチングアプリ。

- **相談者** → オンライン中のカウンセラーを選んで、すぐにチャット or 音声セッション開始
- **カウンセラー** → プロフィールを登録してオンラインにするだけで相談を受付

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Astro + React Islands |
| バックエンド | SST v3 + AWS Lambda |
| API | GraphQL (graphql-yoga) |
| 型生成 | gql.tada |
| インフラ | AWS (API Gateway v2) |
| フォーマッター | Biome |

## 構成

```
mentalcare/
├── packages/
│   ├── core/        # ビジネスロジック
│   ├── functions/   # Lambda ハンドラー・GraphQL スキーマ
│   ├── types/       # 共通型定義
│   └── web/         # Astro フロントエンド
└── sst.config.ts    # インフラ定義
```

## インストール

```bash
npm install
```

## 起動

```bash
npx sst dev
```

`sst dev` を起動すると以下が同時に立ち上がります。

- Astro 開発サーバー（フロントエンド）
- Lambda 関数のローカルエミュレーション
- `typedefs.ts` の変更を検知して `graphql-env.d.ts` を自動生成（型の自動更新）

