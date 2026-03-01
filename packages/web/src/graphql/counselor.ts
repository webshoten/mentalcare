import { executeGraphQL, graphql } from "./client";

export const CounselorsQuery = graphql(`
  query Counselors {
    counselors {
      id
      name
      photoUrl
      rating
      specialty
      experienceYears
    }
    counselorStats {
      total
    }
  }
`);

export const CounselorQuery = graphql(`
  query Counselor($id: ID!) {
    counselor(id: $id) {
      id
      name
      photoUrl
      rating
      specialty
      experienceYears
    }
  }
`);

export const SeedDatabaseMutation = graphql(`
  mutation SeedDatabase {
    seedDatabase {
      seeded
    }
  }
`);

export const fetchCounselors = () =>
  executeGraphQL(CounselorsQuery);

export const fetchCounselor = (id: string) =>
  executeGraphQL(CounselorQuery, { id });

export const seedDatabase = () =>
  executeGraphQL(SeedDatabaseMutation);
