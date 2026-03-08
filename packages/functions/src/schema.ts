import { createSchema } from "graphql-yoga";
import { appointmentResolvers } from "./appointment/resolver";
import { chimeResolvers } from "./chime/resolver";
import { counselorResolvers } from "./counselor/resolver";
import { sessionResolvers } from "./session/resolver";
import { talkerResolvers } from "./talker/resolver";
import { typeDefs } from "./typedefs";

export const schema = createSchema({
  typeDefs,
  resolvers: {
    Query: {
      ...counselorResolvers.Query,
      ...appointmentResolvers.Query,
      ...chimeResolvers.Query,
      ...talkerResolvers.Query,
      ...sessionResolvers.Query,
    },
    Mutation: {
      ...counselorResolvers.Mutation,
      ...appointmentResolvers.Mutation,
      ...chimeResolvers.Mutation,
    },
    Counselor: {
      ...counselorResolvers.Counselor,
    },
    Appointment: {
      ...appointmentResolvers.Appointment,
    },
  },
});
