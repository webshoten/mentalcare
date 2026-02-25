import { createSchema } from "graphql-yoga";
import { counselorResolvers } from "./counselor/resolver";
import { typeDefs } from "./typedefs";

export const schema = createSchema({
  typeDefs,
  resolvers: {
    Query: {
      ...counselorResolvers.Query,
    },
  },
});
