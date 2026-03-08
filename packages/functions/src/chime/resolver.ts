import {
  ChimeSDKMeetingsClient,
  CreateAttendeeCommand,
  CreateMeetingCommand,
  GetMeetingCommand,
  ListAttendeesCommand,
} from "@aws-sdk/client-chime-sdk-meetings";
import { SessionRepository } from "@mentalcare/core/session";

const chime = new ChimeSDKMeetingsClient({ region: "us-east-1" });

export const chimeResolvers = {
  Query: {
    chimeStatus: async () => {
      const sessions = await SessionRepository.findAll();
      const results = await Promise.all(
        sessions.map(async (s) => {
          if (!s.chimeMeetingId) {
            return {
              sessionId: s.id,
              appointmentId: s.appointmentId,
              talkerId: s.talkerId,
              sessionStatus: s.status,
              chimeMeetingId: null,
              attendees: null,
            };
          }
          try {
            const result = await chime.send(
              new ListAttendeesCommand({ MeetingId: s.chimeMeetingId }),
            );
            return {
              sessionId: s.id,
              appointmentId: s.appointmentId,
              talkerId: s.talkerId,
              sessionStatus: s.status,
              chimeMeetingId: s.chimeMeetingId,
              attendees: (result.Attendees ?? []).map((at) => ({
                attendeeId: at.AttendeeId!,
                externalUserId: at.ExternalUserId!,
              })),
            };
          } catch {
            return {
              sessionId: s.id,
              appointmentId: s.appointmentId,
              talkerId: s.talkerId,
              sessionStatus: s.status,
              chimeMeetingId: s.chimeMeetingId,
              attendees: [],
            };
          }
        }),
      );
      return results;
    },
  },

  Mutation: {
    createChimeMeeting: async () => {
      const result = await chime.send(
        new CreateMeetingCommand({
          ClientRequestToken: crypto.randomUUID(),
          MediaRegion: "ap-northeast-1",
          ExternalMeetingId: `debug-${Date.now()}`,
        }),
      );
      const m = result.Meeting!;
      return {
        meetingId: m.MeetingId!,
        mediaPlacement: {
          audioHostUrl: m.MediaPlacement!.AudioHostUrl!,
          audioFallbackUrl: m.MediaPlacement!.AudioFallbackUrl!,
          signalingUrl: m.MediaPlacement!.SignalingUrl!,
          turnControlUrl: m.MediaPlacement!.TurnControlUrl!,
        },
        mediaRegion: m.MediaRegion!,
      };
    },

    createChimeAttendee: async (_: unknown, { meetingId }: { meetingId: string }) => {
      const result = await chime.send(
        new CreateAttendeeCommand({
          MeetingId: meetingId,
          ExternalUserId: `debug-user-${Date.now()}`,
        }),
      );
      const a = result.Attendee!;
      return {
        attendeeId: a.AttendeeId!,
        externalUserId: a.ExternalUserId!,
        joinToken: a.JoinToken!,
      };
    },

    joinChimeMeeting: async (_: unknown, { appointmentId }: { appointmentId: string }) => {
      // Appointment に紐づく ACTIVE な Session から chimeMeetingId を取得
      const sessions = await SessionRepository.findByAppointmentId(appointmentId);
      const activeSession = sessions.find((s) => s.status === "ACTIVE");
      if (!activeSession) throw new Error("ACTIVE な Session が見つかりません");
      if (!activeSession.chimeMeetingId) throw new Error("Chime Meeting が未作成です");

      const meetingResult = await chime.send(
        new GetMeetingCommand({ MeetingId: activeSession.chimeMeetingId }),
      );
      const m = meetingResult.Meeting!;

      const attendeeResult = await chime.send(
        new CreateAttendeeCommand({
          MeetingId: activeSession.chimeMeetingId,
          ExternalUserId: `user-${Date.now()}`,
        }),
      );
      const a = attendeeResult.Attendee!;

      return {
        meeting: {
          meetingId: m.MeetingId!,
          mediaRegion: m.MediaRegion!,
          mediaPlacement: {
            audioHostUrl: m.MediaPlacement!.AudioHostUrl!,
            audioFallbackUrl: m.MediaPlacement!.AudioFallbackUrl!,
            signalingUrl: m.MediaPlacement!.SignalingUrl!,
            turnControlUrl: m.MediaPlacement!.TurnControlUrl!,
          },
        },
        attendee: {
          attendeeId: a.AttendeeId!,
          externalUserId: a.ExternalUserId!,
          joinToken: a.JoinToken!,
        },
      };
    },
  },
};
