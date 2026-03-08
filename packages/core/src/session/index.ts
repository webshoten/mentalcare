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

export type SessionStatus = "ACTIVE" | "ENDED";

export type Session = {
  id: string;
  appointmentId: string;
  talkerId: string;
  chimeMeetingId?: string;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  ttl?: number;
};

// ──────────────────────────────
// Repository
// ──────────────────────────────

export const SessionRepository = {
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
    return items;
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

  async findByAppointmentId(appointmentId: string): Promise<Session[]> {
    const items: Session[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await client.send(
        new QueryCommand({
          TableName: Resource.SessionTable.name,
          IndexName: "byAppointment",
          KeyConditionExpression: "appointmentId = :aid",
          ExpressionAttributeValues: { ":aid": appointmentId },
          ExclusiveStartKey: lastKey,
        }),
      );
      items.push(...((result.Items ?? []) as Session[]));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return items;
  },

  async create(session: Session): Promise<Session> {
    await client.send(
      new PutCommand({
        TableName: Resource.SessionTable.name,
        Item: session,
      }),
    );
    return session;
  },

  async setChimeMeetingId(id: string, chimeMeetingId: string): Promise<Session> {
    const result = await client.send(
      new UpdateCommand({
        TableName: Resource.SessionTable.name,
        Key: { id },
        UpdateExpression: "SET chimeMeetingId = :chimeMeetingId",
        ExpressionAttributeValues: { ":chimeMeetingId": chimeMeetingId },
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes as Session;
  },
};
