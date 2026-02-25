import { executeGraphQL, graphql } from "./client";

export const AvailableCounselorsQuery = graphql(`
  query AvailableCounselors {
    availableCounselors {
      id
      name
      photoUrl
      availability
      availableAt
      rating
      sessionCount
    }
  }
`);

export const fetchAvailableCounselors = () =>
  executeGraphQL(AvailableCounselorsQuery);
