import {
  type Appointment,
  AppointmentRepository,
  calculateAvailability,
} from "@mentalcare/core/appointment";
import { CounselorRepository } from "@mentalcare/core/counselor";

export const appointmentResolvers = {
  Query: {
    openAppointments: () => AppointmentRepository.findOpen(),
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

    bookAppointment: (_: unknown, { appointmentId }: { appointmentId: string }) =>
      AppointmentRepository.book(appointmentId),

    endAppointment: (_: unknown, { appointmentId }: { appointmentId: string }) =>
      AppointmentRepository.updateStatus(appointmentId, "ENDED", {
        endedAt: new Date().toISOString(),
      }),
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
