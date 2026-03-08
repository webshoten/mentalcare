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
      chimeMeetingId
    }
  }
`);

export const ChimeStatusQuery = graphql(`
  query ChimeStatus {
    chimeStatus {
      appointmentId
      appointmentStatus
      chimeMeetingId
      attendees {
        attendeeId
        externalUserId
      }
    }
  }
`);

export const JoinChimeMeetingMutation = graphql(`
  mutation JoinChimeMeeting($appointmentId: ID!) {
    joinChimeMeeting(appointmentId: $appointmentId) {
      meeting {
        meetingId
        mediaRegion
        mediaPlacement {
          audioHostUrl
          audioFallbackUrl
          signalingUrl
          turnControlUrl
        }
      }
      attendee {
        attendeeId
        externalUserId
        joinToken
      }
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

export const JoinAppointmentMutation = graphql(`
  mutation JoinAppointment($appointmentId: ID!) {
    joinAppointment(appointmentId: $appointmentId) {
      id
      status
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

export const CreateChimeMeetingMutation = graphql(`
  mutation CreateChimeMeeting {
    createChimeMeeting {
      meetingId
      mediaRegion
      mediaPlacement {
        audioHostUrl
        audioFallbackUrl
        signalingUrl
        turnControlUrl
      }
    }
  }
`);

export const CreateChimeAttendeeMutation = graphql(`
  mutation CreateChimeAttendee($meetingId: String!) {
    createChimeAttendee(meetingId: $meetingId) {
      attendeeId
      externalUserId
      joinToken
    }
  }
`);

export const createChimeMeeting = () => executeGraphQL(CreateChimeMeetingMutation);
export const createChimeAttendee = (meetingId: string) =>
  executeGraphQL(CreateChimeAttendeeMutation, { meetingId });
export const fetchChimeStatus = () => executeGraphQL(ChimeStatusQuery);
export const joinChimeMeeting = (appointmentId: string) =>
  executeGraphQL(JoinChimeMeetingMutation, { appointmentId });

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
export const joinAppointment = (appointmentId: string) =>
  executeGraphQL(JoinAppointmentMutation, { appointmentId });
export const endAppointment = (appointmentId: string) =>
  executeGraphQL(EndAppointmentMutation, { appointmentId });
