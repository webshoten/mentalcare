import {
  ChimeSDKMeetingsClient,
  CreateAttendeeCommand,
  CreateMeetingCommand,
  DeleteMeetingCommand,
  GetMeetingCommand,
  ListAttendeesCommand,
} from "@aws-sdk/client-chime-sdk-meetings";
import { AppointmentRepository } from "@mentalcare/core/appointment";
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

    createChimeAttendee: async (
      _: unknown,
      { meetingId }: { meetingId: string },
    ) => {
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

    joinChimeMeeting: async (
      _: unknown,
      { sessionId }: { sessionId: string },
    ) => {
      let session = await SessionRepository.findById(sessionId);
      if (!session) throw new Error("Session が見つかりません");
      if (session.status !== "ACTIVE") {
        throw new Error("Session は ACTIVE ではありません");
      }

      // Chime Meeting が未作成なら作成（最初の参加者がトリガー）
      if (!session.chimeMeetingId) {
        const meetingResult = await chime.send(
          new CreateMeetingCommand({
            ClientRequestToken: sessionId,
            MediaRegion: "ap-northeast-1",
            ExternalMeetingId: sessionId,
          }),
        );
        session = await SessionRepository.setChimeMeetingId(
          sessionId,
          meetingResult.Meeting!.MeetingId!,
        );
      }

      const chimeMeetingId = session.chimeMeetingId!;

      const meetingResult = await chime.send(
        new GetMeetingCommand({ MeetingId: chimeMeetingId }),
      );
      const m = meetingResult.Meeting!;

      const attendeeResult = await chime.send(
        new CreateAttendeeCommand({
          MeetingId: chimeMeetingId,
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

    endSession: async (_: unknown, { sessionId }: { sessionId: string }) => {
      const session = await SessionRepository.findById(sessionId);
      if (!session) throw new Error("Session が見つかりません");

      // Chime Meeting を削除
      if (session.chimeMeetingId) {
        try {
          await chime.send(
            new DeleteMeetingCommand({ MeetingId: session.chimeMeetingId }),
          );
        } catch {
          // Meeting が既に期限切れでも続行
        }
      }

      // Session を ENDED にし、Appointment を WAITING に戻す
      const ended = await SessionRepository.end(sessionId);
      await AppointmentRepository.updateStatus(session.appointmentId, "WAITING");
      return ended;
    },
  },
};
