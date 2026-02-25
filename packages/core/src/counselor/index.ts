import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// ──────────────────────────────
// Types
// ──────────────────────────────

export type CounselorAvailability = "AVAILABLE" | "SOON" | "LATER" | "OFFLINE";

export type Counselor = {
  id: string;
  name: string;
  photoUrl?: string;
  availability: CounselorAvailability;
  availableAt?: string; // ISO8601 - SOON / LATER のとき対応開始予定時刻
  rating?: number;
  sessionCount: number;
  updatedAt: string;
};

// ──────────────────────────────
// Repository
// ──────────────────────────────

export const CounselorRepository = {
  // バブル画面用：OFFLINE 以外のカウンセラーを全件取得
  // MVP規模（〜100件）ではスキャンで十分
  async findAvailable(): Promise<Counselor[]> {
    const result = await client.send(
      new ScanCommand({
        TableName: Resource.CounselorTable.name,
        FilterExpression: "availability <> :offline",
        ExpressionAttributeValues: {
          ":offline": "OFFLINE",
        },
      }),
    );
    return (result.Items ?? []) as Counselor[];
  },
};
