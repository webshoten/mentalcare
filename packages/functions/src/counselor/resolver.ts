import { CounselorRepository } from "@mentalcare/core/counselor";

export const counselorResolvers = {
  Query: {
    availableCounselors: () => CounselorRepository.findAvailable(),
  },
};
