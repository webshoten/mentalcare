import { createSchema } from "graphql-yoga";
import { appointmentResolvers } from "./appointment/resolver";
import { counselorResolvers } from "./counselor/resolver";
import { typeDefs } from "./typedefs";

export const schema = createSchema({
  typeDefs,
  resolvers: {
    Query: {
      ...counselorResolvers.Query,
      ...appointmentResolvers.Query,
    },
    Mutation: {
      ...counselorResolvers.Mutation,
      ...appointmentResolvers.Mutation,
    },
    Counselor: {
      ...counselorResolvers.Counselor,
    },
    Appointment: {
      ...appointmentResolvers.Appointment,
    },
  },
});
