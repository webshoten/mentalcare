import { executeGraphQL, graphql } from "./client";

export const SessionsQuery = graphql(`
  query Sessions {
    sessions {
      id
      appointmentId
      talkerId
      chimeMeetingId
      status
      startedAt
      endedAt
    }
  }
`);

export const fetchSessions = () => executeGraphQL(SessionsQuery);
