import { SessionRepository } from "@mentalcare/core/session";

export const sessionResolvers = {
  Query: {
    sessions: () => SessionRepository.findAll(),
  },
};
