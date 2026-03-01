/* eslint-disable */
/* prettier-ignore */

export type introspection_types = {
    'Appointment': { kind: 'OBJECT'; name: 'Appointment'; fields: { 'availability': { name: 'availability'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'ENUM'; name: 'CounselorAvailability'; ofType: null; }; } }; 'availableAt': { name: 'availableAt'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'counselor': { name: 'counselor'; type: { kind: 'OBJECT'; name: 'Counselor'; ofType: null; } }; 'counselorId': { name: 'counselorId'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'createdAt': { name: 'createdAt'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'endedAt': { name: 'endedAt'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'ID'; ofType: null; }; } }; 'scheduledEnd': { name: 'scheduledEnd'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'scheduledStart': { name: 'scheduledStart'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'status': { name: 'status'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'ENUM'; name: 'AppointmentStatus'; ofType: null; }; } }; }; };
    'AppointmentStatus': { name: 'AppointmentStatus'; enumValues: 'OPEN' | 'WAITING' | 'ACTIVE' | 'ENDED'; };
    'Boolean': unknown;
    'Counselor': { kind: 'OBJECT'; name: 'Counselor'; fields: { 'experienceYears': { name: 'experienceYears'; type: { kind: 'SCALAR'; name: 'Int'; ofType: null; } }; 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'ID'; ofType: null; }; } }; 'name': { name: 'name'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'photoUrl': { name: 'photoUrl'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'rating': { name: 'rating'; type: { kind: 'SCALAR'; name: 'Float'; ofType: null; } }; 'specialty': { name: 'specialty'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; }; };
    'CounselorAvailability': { name: 'CounselorAvailability'; enumValues: 'AVAILABLE' | 'SOON' | 'LATER' | 'OFFLINE'; };
    'CounselorStats': { kind: 'OBJECT'; name: 'CounselorStats'; fields: { 'total': { name: 'total'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; } }; }; };
    'Float': unknown;
    'ID': unknown;
    'Int': unknown;
    'Mutation': { kind: 'OBJECT'; name: 'Mutation'; fields: { 'createAppointment': { name: 'createAppointment'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Appointment'; ofType: null; }; } }; 'endAppointment': { name: 'endAppointment'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Appointment'; ofType: null; }; } }; 'joinAppointment': { name: 'joinAppointment'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Appointment'; ofType: null; }; } }; 'seedDatabase': { name: 'seedDatabase'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'SeedResult'; ofType: null; }; } }; }; };
    'Query': { kind: 'OBJECT'; name: 'Query'; fields: { 'appointment': { name: 'appointment'; type: { kind: 'OBJECT'; name: 'Appointment'; ofType: null; } }; 'appointments': { name: 'appointments'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Appointment'; ofType: null; }; }; }; } }; 'counselor': { name: 'counselor'; type: { kind: 'OBJECT'; name: 'Counselor'; ofType: null; } }; 'counselorAppointment': { name: 'counselorAppointment'; type: { kind: 'OBJECT'; name: 'Appointment'; ofType: null; } }; 'counselorStats': { name: 'counselorStats'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'CounselorStats'; ofType: null; }; } }; 'counselors': { name: 'counselors'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Counselor'; ofType: null; }; }; }; } }; 'openAppointments': { name: 'openAppointments'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Appointment'; ofType: null; }; }; }; } }; }; };
    'SeedResult': { kind: 'OBJECT'; name: 'SeedResult'; fields: { 'seeded': { name: 'seeded'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; } }; }; };
    'String': unknown;
};

/** An IntrospectionQuery representation of your schema.
 *
 * @remarks
 * This is an introspection of your schema saved as a file by GraphQLSP.
 * It will automatically be used by `gql.tada` to infer the types of your GraphQL documents.
 * If you need to reuse this data or update your `scalars`, update `tadaOutputLocation` to
 * instead save to a .ts instead of a .d.ts file.
 */
export type introspection = {
  name: never;
  query: 'Query';
  mutation: 'Mutation';
  subscription: never;
  types: introspection_types;
};

import * as gqlTada from 'gql.tada';

declare module 'gql.tada' {
  interface setupSchema {
    introspection: introspection
  }
}