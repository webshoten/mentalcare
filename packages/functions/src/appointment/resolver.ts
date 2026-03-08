import {
  type Appointment,
  AppointmentRepository,
  calculateAvailability,
} from "@mentalcare/core/appointment";
import { CounselorRepository } from "@mentalcare/core/counselor";
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
} from "@aws-sdk/client-chime-sdk-meetings";

const chime = new ChimeSDKMeetingsClient({ region: "us-east-1" });

export const appointmentResolvers = {
  Query: {
    openAppointments: () => AppointmentRepository.findForBubble(),
    appointments: () => AppointmentRepository.findAll(),
    appointment: (_: unknown, { id }: { id: string }) =>
      AppointmentRepository.findById(id),
    counselorAppointment: (_: unknown, { counselorId }: { counselorId: string }) =>
      AppointmentRepository.findActiveByCounselorId(counselorId),
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
      const existing = await AppointmentRepository.findActiveByCounselorId(counselorId);
      if (existing && existing.status === "OPEN") {
        return AppointmentRepository.updateSchedule(existing.id, scheduledStart, scheduledEnd);
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

    joinAppointment: async (_: unknown, { appointmentId }: { appointmentId: string }) => {
      const appointment = await AppointmentRepository.join(appointmentId);
      // OPEN→WAITING（カウンセラーが入室）のとき Chime Meeting を自動作成
      if (appointment.status === "WAITING" && !appointment.chimeMeetingId) {
        const result = await chime.send(
          new CreateMeetingCommand({
            ClientRequestToken: crypto.randomUUID(),
            MediaRegion: "ap-northeast-1",
            ExternalMeetingId: appointmentId,
          }),
        );
        return AppointmentRepository.setChimeMeetingId(
          appointmentId,
          result.Meeting!.MeetingId!,
        );
      }
      return appointment;
    },

    endAppointment: (_: unknown, { appointmentId }: { appointmentId: string }) =>
      AppointmentRepository.updateStatus(appointmentId, "ENDED", {
        endedAt: new Date().toISOString(),
      }),

    leaveAppointment: (_: unknown, { appointmentId }: { appointmentId: string }) =>
      AppointmentRepository.leave(appointmentId),
  },

  Appointment: {
    availability: (parent: Appointment) =>
      calculateAvailability(parent.scheduledStart, parent.scheduledEnd).availability,

    availableAt: (parent: Appointment) =>
      calculateAvailability(parent.scheduledStart, parent.scheduledEnd).availableAt ?? null,

    counselor: (parent: Appointment) =>
      CounselorRepository.findById(parent.counselorId),
  },
};
