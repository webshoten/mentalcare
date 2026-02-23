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
