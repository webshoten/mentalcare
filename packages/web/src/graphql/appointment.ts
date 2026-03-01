import { executeGraphQL, graphql } from "./client";

export const OpenAppointmentsQuery = graphql(`
  query OpenAppointments {
    openAppointments {
      id
      counselorId
      status
      availability
      availableAt
      scheduledStart
      scheduledEnd
      counselor {
        id
        name
        photoUrl
        rating
        specialty
      }
    }
  }
`);

export const AppointmentQuery = graphql(`
  query Appointment($id: ID!) {
    appointment(id: $id) {
      id
      counselorId
      status
      scheduledStart
      scheduledEnd
      availability
      createdAt
      endedAt
      counselor {
        id
        name
        photoUrl
        specialty
        rating
      }
    }
  }
`);

export const AppointmentsQuery = graphql(`
  query Appointments {
    appointments {
      id
      counselorId
      status
      scheduledStart
      scheduledEnd
      createdAt
      endedAt
    }
  }
`);

export const CounselorAppointmentQuery = graphql(`
  query CounselorAppointment($counselorId: ID!) {
    counselorAppointment(counselorId: $counselorId) {
      id
      status
      scheduledStart
      scheduledEnd
      availability
      availableAt
    }
  }
`);

export const CreateAppointmentMutation = graphql(`
  mutation CreateAppointment($counselorId: ID!, $scheduledStart: String!, $scheduledEnd: String!) {
    createAppointment(counselorId: $counselorId, scheduledStart: $scheduledStart, scheduledEnd: $scheduledEnd) {
      id
      status
      scheduledStart
      scheduledEnd
      availability
    }
  }
`);

export const BookAppointmentMutation = graphql(`
  mutation BookAppointment($appointmentId: ID!) {
    bookAppointment(appointmentId: $appointmentId) {
      id
      status
      counselorId
    }
  }
`);

export const EndAppointmentMutation = graphql(`
  mutation EndAppointment($appointmentId: ID!) {
    endAppointment(appointmentId: $appointmentId) {
      id
      status
      endedAt
    }
  }
`);

export const fetchOpenAppointments = () => executeGraphQL(OpenAppointmentsQuery);
export const fetchAppointment = (id: string) => executeGraphQL(AppointmentQuery, { id });
export const fetchAppointments = () => executeGraphQL(AppointmentsQuery);
export const fetchCounselorAppointment = (counselorId: string) =>
  executeGraphQL(CounselorAppointmentQuery, { counselorId });
export const createAppointment = (
  counselorId: string,
  scheduledStart: string,
  scheduledEnd: string,
) => executeGraphQL(CreateAppointmentMutation, { counselorId, scheduledStart, scheduledEnd });
export const bookAppointment = (appointmentId: string) =>
  executeGraphQL(BookAppointmentMutation, { appointmentId });
export const endAppointment = (appointmentId: string) =>
  executeGraphQL(EndAppointmentMutation, { appointmentId });
