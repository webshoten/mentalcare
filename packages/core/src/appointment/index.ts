import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
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

export type AppointmentStatus = "OPEN" | "WAITING" | "ACTIVE" | "ENDED";

export type CounselorAvailability = "AVAILABLE" | "SOON" | "LATER" | "OFFLINE";

export type Appointment = {
  id: string;
  counselorId: string;
  status: AppointmentStatus;
  scheduledStart: string; // HH:MM (JST)
  scheduledEnd: string; // HH:MM (JST)
  createdAt: string;
  endedAt?: string;
  ttl?: number;
};

// ──────────────────────────────
// Availability 算出（scheduledStart/scheduledEnd は JST "HH:MM"）
// ──────────────────────────────

export function calculateAvailability(
  scheduledStart: string,
  scheduledEnd: string,
): { availability: CounselorAvailability; availableAt?: string } {
  const now = new Date();
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const todayDate = jstNow.toISOString().slice(0, 10); // "YYYY-MM-DD" (JST)

  const startISO = `${todayDate}T${scheduledStart}:00+09:00`;
  const endISO = `${todayDate}T${scheduledEnd}:00+09:00`;
  const start = new Date(startISO);
  const end = new Date(endISO);
  const diffMin = (start.getTime() - now.getTime()) / 60000;

  if (now >= start && now <= end) return { availability: "AVAILABLE" };
  if (now > end) return { availability: "OFFLINE" };
  if (diffMin <= 30) return { availability: "SOON", availableAt: startISO };
  if (diffMin <= 60) return { availability: "LATER", availableAt: startISO };
  return { availability: "OFFLINE" };
}

// ──────────────────────────────
// Repository
// ──────────────────────────────

export const AppointmentRepository = {
  async create(appointment: Omit<Appointment, "ttl">): Promise<Appointment> {
    // scheduledEnd (HH:MM JST) を基に初期 TTL を設定する
    // → endAppointment が呼ばれなかった場合でも scheduledEnd + 1時間後に自動削除
    const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const createdJst = new Date(new Date(appointment.createdAt).getTime() + JST_OFFSET_MS);
    const todayJST = createdJst.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const endISO = `${todayJST}T${appointment.scheduledEnd}:00+09:00`;
    const ttl = Math.floor(new Date(endISO).getTime() / 1000) + 60 * 60; // +1時間バッファ

    const item = { ...appointment, ttl };
    await client.send(
      new PutCommand({
        TableName: Resource.AppointmentTable.name,
        Item: item,
      }),
    );
    return item;
  },

  async findById(id: string): Promise<Appointment | null> {
    const result = await client.send(
      new GetCommand({
        TableName: Resource.AppointmentTable.name,
        Key: { id },
      }),
    );
    return (result.Item as Appointment) ?? null;
  },

  async findAll(): Promise<Appointment[]> {
    const items: Appointment[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await client.send(
        new ScanCommand({
          TableName: Resource.AppointmentTable.name,
          ExclusiveStartKey: lastKey,
        }),
      );
      items.push(...((result.Items ?? []) as Appointment[]));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // バブルUI用：ENDED 以外を全件返す（表示制御はフロント側で行う）
  async findForBubble(): Promise<Appointment[]> {
    const all = await AppointmentRepository.findAll();
    return all.filter((a) => a.status !== "ENDED");
  },

  // カウンセラーの現在の OPEN / WAITING / ACTIVE アポイントメント(ENDED は除く)
  async findActiveByCounselorId(
    counselorId: string,
  ): Promise<Appointment | null> {
    const result = await client.send(
      new QueryCommand({
        TableName: Resource.AppointmentTable.name,
        IndexName: "byCounselor",
        KeyConditionExpression: "counselorId = :counselorId",
        ExpressionAttributeValues: { ":counselorId": counselorId },
      }),
    );
    const items = (result.Items ?? []) as Appointment[];
    return (
      items.find(
        (a) =>
          a.status === "OPEN" || a.status === "WAITING" ||
          a.status === "ACTIVE",
      ) ?? null
    );
  },

  // 離脱（WAITING→OPEN）：相談者が待機中に離脱したときに枠を解放する
  async leave(id: string): Promise<Appointment> {
    const result = await client.send(
      new UpdateCommand({
        TableName: Resource.AppointmentTable.name,
        Key: { id },
        UpdateExpression: "SET #status = :open",
        ConditionExpression: "#status = :waiting",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":open": "OPEN", ":waiting": "WAITING" },
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes as Appointment;
  },

  // 入室（OPEN→WAITING / WAITING→ACTIVE）
  async join(id: string): Promise<Appointment> {
    // まず WAITING→ACTIVE を試みる（2人目の入室）
    try {
      const result = await client.send(
        new UpdateCommand({
          TableName: Resource.AppointmentTable.name,
          Key: { id },
          UpdateExpression: "SET #status = :active",
          ConditionExpression: "#status = :waiting",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":active": "ACTIVE",
            ":waiting": "WAITING",
          },
          ReturnValues: "ALL_NEW",
        }),
      );
      return result.Attributes as Appointment;
    } catch (e: unknown) {
      if ((e as { name?: string }).name !== "ConditionalCheckFailedException") {
        throw e;
      }
    }
    // 次に OPEN→WAITING を試みる（1人目の入室）
    try {
      const result = await client.send(
        new UpdateCommand({
          TableName: Resource.AppointmentTable.name,
          Key: { id },
          UpdateExpression: "SET #status = :waiting",
          ConditionExpression: "#status = :open",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":waiting": "WAITING", ":open": "OPEN" },
          ReturnValues: "ALL_NEW",
        }),
      );
      return result.Attributes as Appointment;
    } catch (e: unknown) {
      if ((e as { name?: string }).name === "ConditionalCheckFailedException") {
        throw new Error("このアポイントメントへの参加に失敗しました");
      }
      throw e;
    }
  },

  // 相談者が予約（楽観的排他制御：OPEN のみ成功）
  async book(id: string): Promise<Appointment> {
    try {
      const result = await client.send(
        new UpdateCommand({
          TableName: Resource.AppointmentTable.name,
          Key: { id },
          UpdateExpression: "SET #status = :waiting",
          ConditionExpression: "#status = :open",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":waiting": "WAITING", ":open": "OPEN" },
          ReturnValues: "ALL_NEW",
        }),
      );
      return result.Attributes as Appointment;
    } catch (e: unknown) {
      if ((e as { name?: string }).name === "ConditionalCheckFailedException") {
        throw new Error("このアポイントメントはすでに予約済みです");
      }
      throw e;
    }
  },

  // カウンセラーが既存OPENアポイントメントの時刻を更新（IDは変わらない）
  async updateSchedule(
    id: string,
    scheduledStart: string,
    scheduledEnd: string,
  ): Promise<Appointment> {
    const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const nowJst = new Date(Date.now() + JST_OFFSET_MS);
    const todayJST = nowJst.toISOString().slice(0, 10);
    const endISO = `${todayJST}T${scheduledEnd}:00+09:00`;
    const ttl = Math.floor(new Date(endISO).getTime() / 1000) + 60 * 60;

    const result = await client.send(
      new UpdateCommand({
        TableName: Resource.AppointmentTable.name,
        Key: { id },
        UpdateExpression: "SET scheduledStart = :start, scheduledEnd = :end, #ttl = :ttl",
        ConditionExpression: "#status = :open",
        ExpressionAttributeNames: { "#status": "status", "#ttl": "ttl" },
        ExpressionAttributeValues: {
          ":start": scheduledStart,
          ":end": scheduledEnd,
          ":open": "OPEN",
          ":ttl": ttl,
        },
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes as Appointment;
  },

  async delete(id: string): Promise<void> {
    await client.send(
      new DeleteCommand({
        TableName: Resource.AppointmentTable.name,
        Key: { id },
      }),
    );
  },

  async updateStatus(
    id: string,
    status: AppointmentStatus,
    extra?: Partial<Appointment>,
  ): Promise<Appointment> {
    const updates: Record<string, unknown> = { status, ...extra };
    if (status === "ENDED" && extra?.endedAt) {
      const TTL_SECONDS = 60; // 1分（テスト用）
      updates.ttl = Math.floor(new Date(extra.endedAt).getTime() / 1000) +
        TTL_SECONDS;
    }
    const setExpr = Object.keys(updates)
      .map((k) => `#${k} = :${k}`)
      .join(", ");
    const names = Object.fromEntries(
      Object.keys(updates).map((k) => [`#${k}`, k]),
    );
    const values = Object.fromEntries(
      Object.keys(updates).map((k) => [`:${k}`, updates[k]]),
    );

    const result = await client.send(
      new UpdateCommand({
        TableName: Resource.AppointmentTable.name,
        Key: { id },
        UpdateExpression: `SET ${setExpr}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes as Appointment;
  },
};
