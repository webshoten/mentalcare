import { graphql } from "gql.tada";
import type { TadaDocumentNode } from "gql.tada";
import { print } from "graphql";

export { graphql };

export async function executeGraphQL<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  variables?: Variables,
): Promise<Result> {
  const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: print(query),
      variables: variables ?? undefined,
    }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error(json.errors[0].message);
  }

  return json.data as Result;
}
