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

## GraphQL スキーマの拡張

### 1. 型定義を追加する

`packages/functions/src/typedefs.ts` を編集します。

```ts
export const typeDefs = /* GraphQL */ `
  type Query {
    hello: String!
    myNewQuery: String!  # 追加
  }
`;
```

ファイルを保存すると自動で以下が実行されます。

```
typedefs.ts 保存
  → schema.graphql 生成
  → graphql-env.d.ts 更新（フロントエンドの型が解決される）
```

### 2. リゾルバーを追加する

`packages/functions/src/schema.ts` を編集します。

```ts
resolvers: {
  Query: {
    hello: () => Example.hello(),
    myNewQuery: () => "新しいクエリ",  // 追加
  },
},
```

### 3. フロントエンドから呼び出す

**SSR（Astro）**

```astro
---
import { executeGraphQL, graphql } from "../graphql/client";

const MyQuery = graphql(`query { myNewQuery }`);
const result = await executeGraphQL(MyQuery);
---
<p>{result.myNewQuery}</p>
```

**クライアント（React Island）**

```tsx
import { useQuery } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { executeGraphQL, graphql } from "../graphql/client";

const MyQuery = graphql(`query { myNewQuery }`);

function MyComponent() {
  const { data } = useQuery({
    queryKey: ["myNewQuery"],
    queryFn: () => executeGraphQL(MyQuery),
  });
  return <p>{data?.myNewQuery}</p>;
}

export function MyIsland() {
  return (
    <QueryClientProvider client={queryClient}>
      <MyComponent />
    </QueryClientProvider>
  );
}
```

```astro
<!-- ページ側 -->
<MyIsland client:load />
```

## ビジネスロジックの拡張

`packages/core/src/` 以下にモジュールを追加します。

```
packages/core/src/
├── example/     # サンプル
└── your-module/ # 追加したいモジュール
    └── index.ts
```

`packages/core/src/index.ts` にエクスポートを追加すれば `@mentalcare/core/your-module` でインポートできます。
