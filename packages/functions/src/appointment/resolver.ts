import {
  type Appointment,
  AppointmentRepository,
  calculateAvailability,
} from "@mentalcare/core/appointment";
import { CounselorRepository } from "@mentalcare/core/counselor";
import { SessionRepository } from "@mentalcare/core/session";
import {
  ChimeSDKMeetingsClient,
  DeleteMeetingCommand,
} from "@aws-sdk/client-chime-sdk-meetings";

const chime = new ChimeSDKMeetingsClient({ region: "us-east-1" });

export const appointmentResolvers = {
  Query: {
    openAppointments: () => AppointmentRepository.findForBubble(),
    appointments: () => AppointmentRepository.findAll(),
    appointment: (_: unknown, { id }: { id: string }) =>
      AppointmentRepository.findById(id),
    counselorAppointment: (
      _: unknown,
      { counselorId }: { counselorId: string },
    ) => AppointmentRepository.findActiveByCounselorId(counselorId),
  },

  Mutation: {
    createAppointment: async (
      _: unknown,
      {
        counselorId,
        scheduledStart,
        scheduledEnd,
      }: { counselorId: string; scheduledStart: string; scheduledEnd: string },
    ) => {
      // 既存の OPEN アポイントメントがあれば時刻だけ更新（ID はそのまま）
      const existing = await AppointmentRepository.findActiveByCounselorId(
        counselorId,
      );
      if (existing && existing.status === "OPEN") {
        return AppointmentRepository.updateSchedule(
          existing.id,
          scheduledStart,
          scheduledEnd,
        );
      }
      // なければ新規作成
      return AppointmentRepository.create({
        id: crypto.randomUUID(),
        counselorId,
        status: "OPEN",
        scheduledStart,
        scheduledEnd,
        createdAt: new Date().toISOString(),
      });
    },

    joinAppointment: async (
      _: unknown,
      { appointmentId, talkerId }: { appointmentId: string; talkerId?: string },
    ) => {
      const appointment = await AppointmentRepository.join(appointmentId);

      // WAITING→ACTIVE（相談者が入室）のとき Session 作成
      if (appointment.status === "ACTIVE" && talkerId) {
        const sessionId = crypto.randomUUID();
        await SessionRepository.create({
          id: sessionId,
          appointmentId,
          talkerId,
          status: "ACTIVE",
          startedAt: new Date().toISOString(),
        });
        return { appointment, sessionId };
      }

      return { appointment, sessionId: null };
    },

    endAppointment: (
      _: unknown,
      { appointmentId }: { appointmentId: string },
    ) =>
      AppointmentRepository.updateStatus(appointmentId, "ENDED", {
        endedAt: new Date().toISOString(),
      }),

    leaveAppointment: (
      _: unknown,
      { appointmentId }: { appointmentId: string },
    ) => AppointmentRepository.leave(appointmentId),

    deleteAppointment: async (
      _: unknown,
      { appointmentId }: { appointmentId: string },
    ) => {
      const appointment = await AppointmentRepository.findById(appointmentId);
      if (!appointment) return false;
      // 紐づく Session の Chime Meeting を削除
      const sessions = await SessionRepository.findByAppointmentId(
        appointmentId,
      );
      for (const session of sessions) {
        if (session.chimeMeetingId) {
          try {
            await chime.send(
              new DeleteMeetingCommand({ MeetingId: session.chimeMeetingId }),
            );
          } catch {
            // Meeting が既に期限切れでも削除を続行
          }
        }
      }
      await AppointmentRepository.delete(appointmentId);
      return true;
    },
  },

  Appointment: {
    /**
     *  Appointment の availability を返す
     */
    availability: (parent: Appointment) =>
      calculateAvailability(parent.scheduledStart, parent.scheduledEnd)
        .availability,

    /**
     *  Appointment の availableAt を返す
     */
    availableAt: (parent: Appointment) =>
      calculateAvailability(parent.scheduledStart, parent.scheduledEnd)
        .availableAt ?? null,

    /**
     *  Appointment に紐づくカウンセラー情報を返す
     */
    counselor: (parent: Appointment) =>
      CounselorRepository.findById(parent.counselorId),

    /**
     * Appointment に紐づく ACTIVE な Session を返す
     */
    activeSession: async (parent: Appointment) => {
      if (parent.status !== "ACTIVE") return null;
      const sessions = await SessionRepository.findByAppointmentId(parent.id);
      return sessions.find((s) => s.status === "ACTIVE") ?? null;
    },
  },
};
