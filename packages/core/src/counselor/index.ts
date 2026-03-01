import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// ──────────────────────────────
// Types
// ──────────────────────────────

export type Counselor = {
  id: string;
  name: string;
  photoKey?: string;
  rating?: number;
  specialty?: string;
  experienceYears?: number;
  updatedAt: string;
};

// ──────────────────────────────
// Repository
// ──────────────────────────────

export const CounselorRepository = {
  async findAll(): Promise<Counselor[]> {
    const items: Counselor[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await client.send(
        new ScanCommand({
          TableName: Resource.CounselorTable.name,
          ExclusiveStartKey: lastKey,
        }),
      );
      items.push(...((result.Items ?? []) as Counselor[]));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return items;
  },

  async findById(id: string): Promise<Counselor | null> {
    const result = await client.send(
      new GetCommand({
        TableName: Resource.CounselorTable.name,
        Key: { id },
      }),
    );
    return (result.Item as Counselor) ?? null;
  },

  async getStats(): Promise<{ total: number }> {
    const all = await CounselorRepository.findAll();
    return { total: all.length };
  },
};
