import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Resource } from "sst";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

// 現在 JST 時刻から ±N 分ずらした "HH:MM"（JST）を返す
function hhmm(offsetMin: number): string {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const d = new Date(Date.now() + offsetMin * 60 * 1000 + JST_OFFSET_MS);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// randomuser.me のアバター画像を使用
const AVATAR_URLS = [
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
  "https://randomuser.me/api/portraits/women/12.jpg",
  "https://randomuser.me/api/portraits/men/18.jpg",
  "https://randomuser.me/api/portraits/women/29.jpg",
];

async function uploadAvatar(url: string, key: string): Promise<string> {
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

  return key;
}

// availability は calculateAvailability() で動的に算出されるため、
// ここでは scheduledStart / scheduledEnd のみ設定する。
//
//   AVAILABLE  → start = 今より30分前, end = 今より90分後
//   SOON       → start = 今より15分後, end = 今より90分後  （差 ≤ 30分 → SOON）
//   LATER      → start = 今より45分後, end = 今より120分後 （差 30〜60分 → LATER）
//   OFFLINE    → スケジュールなし

const counselorData = [
  {
    id: "counselor-1",
    name: "鈴木 あおい",
    scheduledStart: hhmm(-30),   // 30分前から開始中 → AVAILABLE
    scheduledEnd: hhmm(90),
    rating: 4.9,
    sessionCount: 124,
    specialty: "職場環境・キャリア",
    experienceYears: 15,
    feePerSession: 7000,
  },
  {
    id: "counselor-2",
    name: "田中 みか",
    scheduledStart: hhmm(-60),   // 60分前から開始中 → AVAILABLE
    scheduledEnd: hhmm(60),
    rating: 4.7,
    sessionCount: 89,
    specialty: "対人関係・人間関係",
    experienceYears: 12,
    feePerSession: 6000,
  },
  {
    id: "counselor-3",
    name: "中村 さくら",
    scheduledStart: hhmm(-10),   // 10分前から開始中 → AVAILABLE
    scheduledEnd: hhmm(120),
    rating: 4.8,
    sessionCount: 203,
    specialty: "うつ・気分障害",
    experienceYears: 10,
    feePerSession: 6500,
  },
  {
    id: "counselor-4",
    name: "佐藤 けんじ",
    scheduledStart: hhmm(15),    // 15分後に開始 → SOON（差 ≤ 30分）
    scheduledEnd: hhmm(90),
    rating: 4.6,
    sessionCount: 57,
    specialty: "ストレス・不安",
    experienceYears: 8,
    feePerSession: 5500,
  },
  {
    id: "counselor-5",
    name: "山本 ゆか",
    scheduledStart: hhmm(25),    // 25分後に開始 → SOON（差 ≤ 30分）
    scheduledEnd: hhmm(100),
    rating: 4.5,
    sessionCount: 41,
    specialty: "家族関係・育児",
    experienceYears: 6,
    feePerSession: 5000,
  },
  {
    id: "counselor-6",
    name: "木村 たかし",
    scheduledStart: hhmm(45),    // 45分後に開始 → LATER（差 30〜60分）
    scheduledEnd: hhmm(120),
    rating: 4.4,
    sessionCount: 33,
    specialty: "ストレス・不安",
    experienceYears: 5,
    feePerSession: 4500,
  },
  {
    id: "counselor-7",
    name: "加藤 りな",
    scheduledStart: undefined,   // スケジュールなし → OFFLINE
    scheduledEnd: undefined,
    rating: 4.3,
    sessionCount: 18,
    specialty: "対人関係・人間関係",
    experienceYears: 4,
    feePerSession: 4000,
  },
];

async function seed() {
  const now = new Date();

  console.log("Uploading avatar images to S3...");
  const photoKeys: string[] = [];

  for (let i = 0; i < counselorData.length; i++) {
    const c = counselorData[i];
    const key = `avatars/${c.id}.jpg`;
    const photoKey = await uploadAvatar(AVATAR_URLS[i], key);
    photoKeys.push(photoKey);
    console.log(`  ✓ Uploaded avatar for ${c.name}`);
  }

  console.log(`\nSeeding ${counselorData.length} counselors into DynamoDB...`);

  for (let i = 0; i < counselorData.length; i++) {
    const { scheduledStart, scheduledEnd, ...rest } = counselorData[i];
    const item: Record<string, unknown> = {
      ...rest,
      photoKey: photoKeys[i],
      updatedAt: now.toISOString(),
    };
    if (scheduledStart) item.scheduledStart = scheduledStart;
    if (scheduledEnd) item.scheduledEnd = scheduledEnd;

    await dynamo.send(
      new PutCommand({
        TableName: Resource.CounselorTable.name,
        Item: item,
      }),
    );

    const label = scheduledStart
      ? `${scheduledStart}〜${scheduledEnd}`
      : "OFFLINE";
    console.log(`  ✓ ${rest.name} (schedule: ${label})`);
  }

  console.log("\nDone. Availability is calculated dynamically from scheduledStart/scheduledEnd.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
