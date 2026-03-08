# mentalcare

Mental health counseling matching platform — connect with a counselor instantly.

## Overview

A mental health counseling matching app designed for the modern world, where **quickly** finding someone to talk to and receiving **genuine** support matters most.

- **User** → Browse online counselors and start a chat or voice session instantly
- **Counselor** → Set up a profile, go online, and start receiving sessions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Astro + React Islands |
| Backend | SST v3 + AWS Lambda |
| API | GraphQL (graphql-yoga) |
| Type Generation | gql.tada |
| Infrastructure | AWS (API Gateway v2) |
| Formatter | Biome |

## Structure

```
mentalcare/
├── packages/
│   ├── core/        # Business logic
│   ├── functions/   # Lambda handlers & GraphQL schema
│   ├── types/       # Shared type definitions
│   └── web/         # Astro frontend
└── sst.config.ts    # Infrastructure definition
```

## Installation

```bash
npm install
```

## Development

```bash
npx sst dev
```

Running `sst dev` starts the following simultaneously:

- Astro dev server (frontend)
- Local Lambda function emulation
- Type auto-generation — watches `typedefs.ts` and updates `graphql-env.d.ts` automatically

## Tools

### VSCode 推奨拡張

`.vscode/extensions.json` に定義済み。VSCode が自動で推奨します。

| 拡張 | 用途 |
|------|------|
| Biome | フォーマッター / リンター |
| TypeScript Next | TypeScript 最新機能 |
| Astro | Astro ファイルサポート |
| Draw.io Integration | `.drawio` ファイルの編集 |

### Claude Code MCP サーバー

Claude Code で開発する場合、以下の MCP サーバーを追加してください。

| MCP | セットアップ | 用途 |
|-----|-------------|------|
| drawio | `claude mcp add drawio -- npx -y @drawio/mcp` | データ構造・フロー図の作成 |
| Pencil | [Pencil](https://pencil.evolves.ai/) デスクトップアプリをインストール後、アプリ内から MCP を有効化 | 画面デザイン |

## Assisted By

Development assisted by [Claude](https://claude.ai/) (Anthropic).
