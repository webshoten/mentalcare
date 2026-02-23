import { useQuery } from "@tanstack/react-query";
import { graphql } from "gql.tada";
import { executeGraphQL } from "../graphql/client";

const HelloQuery = graphql(`
  query Hello {
    hello
  }
`);

export function HelloWorld() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hello"],
    queryFn: () => executeGraphQL(HelloQuery),
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return <p>Client: {data?.hello}</p>;
}
