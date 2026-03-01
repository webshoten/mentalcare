import { CounselorRepository } from "@mentalcare/core/counselor";
import { SessionRepository, type Session } from "@mentalcare/core/session";

export const sessionResolvers = {
  Query: {
    session: (_: unknown, { id }: { id: string }) =>
      SessionRepository.findById(id),
    sessions: () => SessionRepository.findAll(),
    pendingSession: (_: unknown, { counselorId }: { counselorId: string }) =>
      SessionRepository.findWaitingByCounselorId(counselorId),
  },

  Mutation: {
    startSession: async (_: unknown, { counselorId }: { counselorId: string }) => {
      const session: Session = {
        id: crypto.randomUUID(),
        counselorId,
        status: "WAITING",
        createdAt: new Date().toISOString(),
      };
      return SessionRepository.create(session);
    },

    endSession: async (_: unknown, { sessionId }: { sessionId: string }) => {
      return SessionRepository.updateStatus(sessionId, "ENDED", {
        endedAt: new Date().toISOString(),
      });
    },
  },

  Session: {
    counselor: (parent: Session) =>
      CounselorRepository.findById(parent.counselorId),
  },
};
