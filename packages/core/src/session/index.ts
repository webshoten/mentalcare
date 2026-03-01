import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// ──────────────────────────────
// Types
// ──────────────────────────────

export type SessionStatus = "WAITING" | "ACTIVE" | "ENDED";

export type Session = {
  id: string;
  counselorId: string;
  status: SessionStatus;
  createdAt: string;
  endedAt?: string;
  rating?: number;
  ttl?: number; // Unix秒 — DynamoDB TTL で自動削除（endedAt 時にセット）
};

// ──────────────────────────────
// Repository
// ──────────────────────────────

export const SessionRepository = {
  async create(session: Omit<Session, "ttl">): Promise<Session> {
    await client.send(
      new PutCommand({
        TableName: Resource.SessionTable.name,
        Item: session,
      }),
    );
    return session;
  },

  async findById(id: string): Promise<Session | null> {
    const result = await client.send(
      new GetCommand({
        TableName: Resource.SessionTable.name,
        Key: { id },
      }),
    );
    return (result.Item as Session) ?? null;
  },

  async findAll(): Promise<Session[]> {
    const items: Session[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await client.send(
        new ScanCommand({
          TableName: Resource.SessionTable.name,
          ExclusiveStartKey: lastKey,
        }),
      );
      items.push(...((result.Items ?? []) as Session[]));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async findWaitingByCounselorId(counselorId: string): Promise<Session | null> {
    const result = await client.send(
      new QueryCommand({
        TableName: Resource.SessionTable.name,
        IndexName: "byCounselor",
        KeyConditionExpression: "counselorId = :counselorId",
        FilterExpression: "#s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":counselorId": counselorId,
          ":status": "WAITING",
        },
        Limit: 1,
      }),
    );
    return (result.Items?.[0] as Session) ?? null;
  },

  async updateStatus(id: string, status: SessionStatus, extra?: Partial<Session>): Promise<Session> {
    const updates: Record<string, unknown> = { status, ...extra };
    if (status === "ENDED" && extra?.endedAt) {
      const TTL_SECONDS = 60; // 1分（テスト用）
      updates.ttl = Math.floor(new Date(extra.endedAt).getTime() / 1000) + TTL_SECONDS;
    }
    const setExpr = Object.keys(updates)
      .map((k) => `#${k} = :${k}`)
      .join(", ");
    const names = Object.fromEntries(Object.keys(updates).map((k) => [`#${k}`, k]));
    const values = Object.fromEntries(Object.keys(updates).map((k) => [`:${k}`, updates[k]]));

    const result = await client.send(
      new UpdateCommand({
        TableName: Resource.SessionTable.name,
        Key: { id },
        UpdateExpression: `SET ${setExpr}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes as Session;
  },
};
