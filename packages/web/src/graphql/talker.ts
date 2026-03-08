import { executeGraphQL, graphql } from "./client";

export const TalkersQuery = graphql(`
  query Talkers {
    talkers {
      id
      name
      createdAt
    }
  }
`);

export const fetchTalkers = () => executeGraphQL(TalkersQuery);
