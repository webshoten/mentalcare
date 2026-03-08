import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// ──────────────────────────────
// Types
// ──────────────────────────────

export type Talker = {
  id: string;
  name: string;
  photoKey?: string;
  createdAt: string;
};

// ──────────────────────────────
// Repository
// ──────────────────────────────

export const TalkerRepository = {
  async findAll(): Promise<Talker[]> {
    const items: Talker[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await client.send(
        new ScanCommand({
          TableName: Resource.TalkerTable.name,
          ExclusiveStartKey: lastKey,
        }),
      );
      items.push(...((result.Items ?? []) as Talker[]));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return items;
  },

  async findById(id: string): Promise<Talker | null> {
    const result = await client.send(
      new GetCommand({
        TableName: Resource.TalkerTable.name,
        Key: { id },
      }),
    );
    return (result.Item as Talker) ?? null;
  },

  async create(talker: Talker): Promise<Talker> {
    await client.send(
      new PutCommand({
        TableName: Resource.TalkerTable.name,
        Item: talker,
      }),
    );
    return talker;
  },
};
