import { Example } from "@mentalcare/core/example";
import { createSchema } from "graphql-yoga";
import { typeDefs } from "./typedefs";

export const schema = createSchema({
  typeDefs,
  resolvers: {
    Query: {
      hello: () => Example.hello(),
    },
  },
});
