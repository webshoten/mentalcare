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
      activeSession {
        id
        status
        chimeMeetingId
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

export const ChimeStatusQuery = graphql(`
  query ChimeStatus {
    chimeStatus {
      sessionId
      appointmentId
      talkerId
      sessionStatus
      chimeMeetingId
      attendees {
        attendeeId
        externalUserId
      }
    }
  }
`);

export const JoinChimeMeetingMutation = graphql(`
  mutation JoinChimeMeeting($sessionId: ID!) {
    joinChimeMeeting(sessionId: $sessionId) {
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
  mutation JoinAppointment($appointmentId: ID!, $talkerId: ID) {
    joinAppointment(appointmentId: $appointmentId, talkerId: $talkerId) {
      appointment {
        id
        status
      }
      sessionId
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

export const DeleteAppointmentMutation = graphql(`
  mutation DeleteAppointment($appointmentId: ID!) {
    deleteAppointment(appointmentId: $appointmentId)
  }
`);

export const deleteAppointment = (appointmentId: string) =>
  executeGraphQL(DeleteAppointmentMutation, { appointmentId });

export const createChimeMeeting = () => executeGraphQL(CreateChimeMeetingMutation);
export const createChimeAttendee = (meetingId: string) =>
  executeGraphQL(CreateChimeAttendeeMutation, { meetingId });
export const fetchChimeStatus = () => executeGraphQL(ChimeStatusQuery);
export const EndSessionMutation = graphql(`
  mutation EndSession($sessionId: ID!) {
    endSession(sessionId: $sessionId) {
      id
      status
      endedAt
    }
  }
`);

export const joinChimeMeeting = (sessionId: string) =>
  executeGraphQL(JoinChimeMeetingMutation, { sessionId });
export const endSession = (sessionId: string) =>
  executeGraphQL(EndSessionMutation, { sessionId });

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
export const joinAppointment = (appointmentId: string, talkerId?: string) =>
  executeGraphQL(JoinAppointmentMutation, { appointmentId, talkerId });
export const endAppointment = (appointmentId: string) =>
  executeGraphQL(EndAppointmentMutation, { appointmentId });
