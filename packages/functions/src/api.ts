import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { createYoga } from "graphql-yoga";
import { schema } from "./schema";

// GraphQL Yogaサーバーの作成
const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  landingPage: true,
  logging: true,
});

export const handler = async (
  event: APIGatewayProxyEventV2,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: <explanation>
  lambdaContext: Context,
): Promise<APIGatewayProxyResult> => {
  try {
    const parameters = new URLSearchParams(
      (event.queryStringParameters as Record<string, string>) || {},
    ).toString();

    const url = `${event.rawPath}?${parameters}`;
    const request: RequestInit = {
      method: event.requestContext.http.method,
      headers: event.headers as HeadersInit,
      body: event.body
        ? Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8")
        : undefined,
    };

    const response = await yoga.fetch(url, request);
    const responseHeaders = Object.fromEntries(response.headers.entries());

    return {
      statusCode: response.status,
      headers: {
        ...responseHeaders,
      },
      body: await response.text(),
      isBase64Encoded: false,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      isBase64Encoded: false,
    };
  }
};
