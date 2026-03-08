import { TalkerRepository } from "@mentalcare/core/talker";

export const talkerResolvers = {
  Query: {
    talkers: () => TalkerRepository.findAll(),
  },
};
