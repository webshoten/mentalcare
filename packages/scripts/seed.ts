import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const now = new Date();
const in15 = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
const in30 = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

const counselors = [
  {
    id: "counselor-1",
    name: "鈴木 あおい",
    photoUrl: null,
    availability: "AVAILABLE",
    availableAt: null,
    rating: 4.9,
    sessionCount: 124,
    updatedAt: now.toISOString(),
  },
  {
    id: "counselor-2",
    name: "田中 みな",
    photoUrl: null,
    availability: "AVAILABLE",
    availableAt: null,
    rating: 4.7,
    sessionCount: 89,
    updatedAt: now.toISOString(),
  },
  {
    id: "counselor-3",
    name: "中村 さくら",
    photoUrl: null,
    availability: "AVAILABLE",
    availableAt: null,
    rating: 4.8,
    sessionCount: 203,
    updatedAt: now.toISOString(),
  },
  {
    id: "counselor-4",
    name: "佐藤 けんじ",
    photoUrl: null,
    availability: "SOON",
    availableAt: in15,
    rating: 4.6,
    sessionCount: 57,
    updatedAt: now.toISOString(),
  },
  {
    id: "counselor-5",
    name: "山本 ゆか",
    photoUrl: null,
    availability: "SOON",
    availableAt: in15,
    rating: 4.5,
    sessionCount: 41,
    updatedAt: now.toISOString(),
  },
  {
    id: "counselor-6",
    name: "木村 たかし",
    photoUrl: null,
    availability: "LATER",
    availableAt: in30,
    rating: 4.4,
    sessionCount: 33,
    updatedAt: now.toISOString(),
  },
  {
    id: "counselor-7",
    name: "加藤 りな",
    photoUrl: null,
    availability: "OFFLINE",
    availableAt: null,
    rating: 4.3,
    sessionCount: 18,
    updatedAt: now.toISOString(),
  },
] as const;

async function seed() {
  console.log(`Seeding ${counselors.length} counselors into ${Resource.CounselorTable.name}...`);

  for (const counselor of counselors) {
    await client.send(
      new PutCommand({
        TableName: Resource.CounselorTable.name,
        Item: counselor,
      }),
    );
    console.log(`  ✓ ${counselor.name} (${counselor.availability})`);
  }

  console.log("Done.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
