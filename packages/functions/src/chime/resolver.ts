import {
  ChimeSDKMeetingsClient,
  CreateAttendeeCommand,
  CreateMeetingCommand,
  GetMeetingCommand,
  ListAttendeesCommand,
} from "@aws-sdk/client-chime-sdk-meetings";
import { AppointmentRepository } from "@mentalcare/core/appointment";

const chime = new ChimeSDKMeetingsClient({ region: "us-east-1" });

export const chimeResolvers = {
  Query: {
    chimeStatus: async () => {
      const appointments = await AppointmentRepository.findAll();
      const results = await Promise.all(
        appointments.map(async (a) => {
          if (!a.chimeMeetingId) {
            return {
              appointmentId: a.id,
              appointmentStatus: a.status,
              chimeMeetingId: null,
              attendees: null,
            };
          }
          try {
            const result = await chime.send(
              new ListAttendeesCommand({ MeetingId: a.chimeMeetingId }),
            );
            return {
              appointmentId: a.id,
              appointmentStatus: a.status,
              chimeMeetingId: a.chimeMeetingId,
              attendees: (result.Attendees ?? []).map((at) => ({
                attendeeId: at.AttendeeId!,
                externalUserId: at.ExternalUserId!,
              })),
            };
          } catch {
            // Meeting が期限切れ・存在しない場合
            return {
              appointmentId: a.id,
              appointmentStatus: a.status,
              chimeMeetingId: a.chimeMeetingId,
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
      const appointment = await AppointmentRepository.findById(appointmentId);
      if (!appointment) throw new Error("Appointment not found");
      if (!appointment.chimeMeetingId) throw new Error("Chime Meeting が未作成です（WAITING 以降でのみ利用可能）");

      const meetingResult = await chime.send(
        new GetMeetingCommand({ MeetingId: appointment.chimeMeetingId }),
      );
      const m = meetingResult.Meeting!;

      const attendeeResult = await chime.send(
        new CreateAttendeeCommand({
          MeetingId: appointment.chimeMeetingId,
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
