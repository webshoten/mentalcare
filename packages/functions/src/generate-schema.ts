import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { typeDefs } from "./typedefs";

const __dirname = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(__dirname, "graphql/schema.graphql"), typeDefs);
console.log("✓ schema.graphql updated");
