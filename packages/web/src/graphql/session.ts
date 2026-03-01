import { executeGraphQL, graphql } from "./client";

export const StartSessionMutation = graphql(`
  mutation StartSession($counselorId: ID!) {
    startSession(counselorId: $counselorId) {
      id
      status
      counselorId
      createdAt
      counselor {
        id
        name
        photoUrl
        specialty
        rating
      }
    }
  }
`);

export const EndSessionMutation = graphql(`
  mutation EndSession($sessionId: ID!) {
    endSession(sessionId: $sessionId) {
      id
      status
      endedAt
    }
  }
`);

export const SessionQuery = graphql(`
  query Session($id: ID!) {
    session(id: $id) {
      id
      status
      counselorId
      createdAt
      counselor {
        id
        name
        photoUrl
        specialty
        rating
      }
    }
  }
`);

export const SessionsQuery = graphql(`
  query Sessions {
    sessions {
      id
      counselorId
      status
      createdAt
      endedAt
    }
  }
`);

export const PendingSessionQuery = graphql(`
  query PendingSession($counselorId: ID!) {
    pendingSession(counselorId: $counselorId) {
      id
      status
      counselorId
      createdAt
    }
  }
`);

export const startSession = (counselorId: string) =>
  executeGraphQL(StartSessionMutation, { counselorId });

export const fetchPendingSession = (counselorId: string) =>
  executeGraphQL(PendingSessionQuery, { counselorId });

export const fetchSessions = () =>
  executeGraphQL(SessionsQuery);

export const endSession = (sessionId: string) =>
  executeGraphQL(EndSessionMutation, { sessionId });

export const fetchSession = (id: string) =>
  executeGraphQL(SessionQuery, { id });
