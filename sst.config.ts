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

    const counselorPhotoBucket = new sst.aws.Bucket("CounselorPhotoBucket");

    const appointmentTable = new sst.aws.Dynamo("AppointmentTable", {
      fields: { id: "string", counselorId: "string" },
      primaryIndex: { hashKey: "id" },
      globalIndexes: {
        byCounselor: { hashKey: "counselorId" },
      },
      ttl: "ttl",
    });

    const talkerTable = new sst.aws.Dynamo("TalkerTable", {
      fields: { id: "string" },
      primaryIndex: { hashKey: "id" },
    });

    const sessionTable = new sst.aws.Dynamo("SessionTable", {
      fields: { id: "string", appointmentId: "string" },
      primaryIndex: { hashKey: "id" },
      globalIndexes: {
        byAppointment: { hashKey: "appointmentId" },
      },
      ttl: "ttl",
    });

    const api = new sst.aws.ApiGatewayV2("MyApi");

    const chimePermissions = [
      {
        actions: [
          "chime:CreateMeeting",
          "chime:GetMeeting",
          "chime:DeleteMeeting",
          "chime:CreateAttendee",
          "chime:DeleteAttendee",
          "chime:ListAttendees",
        ],
        resources: ["*"],
      },
    ];

    api.route("POST /graphql", {
      handler: "packages/functions/src/api.handler",
      link: [counselorTable, counselorPhotoBucket, appointmentTable, talkerTable, sessionTable],
      permissions: chimePermissions,
    });
    api.route("GET /graphql", {
      handler: "packages/functions/src/api.handler",
      link: [counselorTable, counselorPhotoBucket, appointmentTable, talkerTable, sessionTable],
      permissions: chimePermissions,
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
