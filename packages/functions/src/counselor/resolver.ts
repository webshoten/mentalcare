import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  type Counselor,
  CounselorRepository,
} from "@mentalcare/core/counselor";
import { Resource } from "sst";

const s3 = new S3Client({});
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// ──────────────────────────────
// Seed data
// ──────────────────────────────

function hhmm(offsetMin: number): string {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const d = new Date(Date.now() + offsetMin * 60 * 1000 + JST_OFFSET_MS);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const AVATAR_URLS = [
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
  "https://randomuser.me/api/portraits/women/12.jpg",
  "https://randomuser.me/api/portraits/men/18.jpg",
  "https://randomuser.me/api/portraits/women/29.jpg",
];

function buildSeedData() {
  return [
    { id: "counselor-1", name: "鈴木 あおい", scheduledStart: hhmm(-30), scheduledEnd: hhmm(90),  rating: 4.9, specialty: "職場環境・キャリア",   experienceYears: 15 },
    { id: "counselor-2", name: "田中 みか",   scheduledStart: hhmm(-60), scheduledEnd: hhmm(60),  rating: 4.7, specialty: "対人関係・人間関係", experienceYears: 12 },
    { id: "counselor-3", name: "中村 さくら", scheduledStart: hhmm(-10), scheduledEnd: hhmm(120), rating: 4.8, specialty: "うつ・気分障害",     experienceYears: 10 },
    { id: "counselor-4", name: "佐藤 けんじ", scheduledStart: hhmm(15),  scheduledEnd: hhmm(90),  rating: 4.6, specialty: "ストレス・不安",     experienceYears: 8  },
    { id: "counselor-5", name: "山本 ゆか",   scheduledStart: hhmm(25),  scheduledEnd: hhmm(100), rating: 4.5, specialty: "家族関係・育児",     experienceYears: 6  },
    { id: "counselor-6", name: "木村 たかし", scheduledStart: hhmm(45),  scheduledEnd: hhmm(120), rating: 4.4, specialty: "ストレス・不安",     experienceYears: 5  },
    { id: "counselor-7", name: "加藤 りな",   scheduledStart: undefined,  scheduledEnd: undefined,  rating: 4.3, specialty: "対人関係・人間関係", experienceYears: 4  },
  ];
}

async function uploadAvatar(url: string, key: string): Promise<void> {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  await s3.send(
    new PutObjectCommand({
      Bucket: Resource.CounselorPhotoBucket.name,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    }),
  );
}

export const counselorResolvers = {
  Query: {
    counselors: () => CounselorRepository.findAll(),
    counselorStats: () => CounselorRepository.getStats(),
    counselor: (_: unknown, { id }: { id: string }) =>
      CounselorRepository.findById(id),
  },

  Mutation: {
    seedDatabase: async () => {
      const counselors = buildSeedData();
      const now = new Date().toISOString();

      for (let i = 0; i < counselors.length; i++) {
        const c = counselors[i];
        const key = `avatars/${c.id}.jpg`;

        // S3 アップロード失敗はスキップ（DynamoDB 書き込みをブロックしない）
        let photoKey: string | undefined;
        try {
          await uploadAvatar(AVATAR_URLS[i], key);
          photoKey = key;
        } catch {
          console.warn(`Avatar upload failed for ${c.id}, skipping photo`);
        }

        // カウンセラー本体（スケジュールなし）
        const { scheduledStart, scheduledEnd, ...counselorFields } = c;
        await dynamo.send(
          new PutCommand({
            TableName: Resource.CounselorTable.name,
            Item: { ...counselorFields, ...(photoKey ? { photoKey } : {}), updatedAt: now },
          }),
        );

        // アポイントメント（OPEN）を別テーブルに作成（固定IDで上書き）
        if (scheduledStart && scheduledEnd) {
          await dynamo.send(
            new PutCommand({
              TableName: Resource.AppointmentTable.name,
              Item: {
                id: `seed-${c.id}`,
                counselorId: c.id,
                status: "OPEN",
                scheduledStart,
                scheduledEnd,
                createdAt: now,
              },
            }),
          );
        }
      }

      return { seeded: counselors.length };
    },
  },

  Counselor: {
    photoUrl: async (parent: Counselor) => {
      if (!parent.photoKey) return null;
      return getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: Resource.CounselorPhotoBucket.name,
          Key: parent.photoKey,
        }),
        { expiresIn: 3600 },
      );
    },
  },
};
