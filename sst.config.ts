/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "mentalcare",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    const counselorTable = new sst.aws.Dynamo("CounselorTable", {
      fields: { id: "string" },
      primaryIndex: { hashKey: "id" },
    });

    const api = new sst.aws.ApiGatewayV2("MyApi");

    api.route("POST /graphql", {
      handler: "packages/functions/src/api.handler",
      link: [counselorTable],
    });
    api.route("GET /graphql", {
      handler: "packages/functions/src/api.handler",
      link: [counselorTable],
    });

    if ($dev) {
      new sst.x.DevCommand("GqlTadaWatch", {
        dev: {
          command:
            "npx chokidar '../functions/src/typedefs.ts' -c 'npx tsx ../functions/src/generate-schema.ts && npx gql.tada generate-output'",
          directory: "packages/web",
          autostart: true,
        },
      });
    }

    new sst.aws.Astro("MyWeb", {
      path: "packages/web",
      environment: {
        PUBLIC_API_URL: $interpolate`${api.url}`,
      },
      link: [api],
    });

    return {
      MyApiUrl: $interpolate`${api.url}`,
    };
  },
});
