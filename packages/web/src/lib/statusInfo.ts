export type AppointmentCounselor = {
  id: string;
  name: string;
  photoUrl?: string | null;
  rating?: number | null;
  specialty?: string | null;
};

export type Appointment = {
  id: string;
  counselorId: string;
  status: string;
  availability: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  counselor?: AppointmentCounselor | null;
};

export type StatusInfo = {
  label: string;
  color: string;
  dotColor: string;
  bg: string;
  border: string;
  disabled: boolean;
};

export function statusInfo(
  availability: string,
  status?: string,
  scheduledStart?: string | null,
  scheduledEnd?: string | null,
): StatusInfo {
  if (status === "ACTIVE") {
    return { label: "● 通話中", color: "#9CA3AF", dotColor: "#9CA3AF", bg: "#F3F4F6", border: "#E5E7EB", disabled: true };
  }
  if (status === "WAITING") {
    return { label: "● 待機中", color: "#16A34A", dotColor: "#16A34A", bg: "#DCFCE7", border: "#86EFAC", disabled: false };
  }
  switch (availability) {
    case "AVAILABLE":
      return { label: "● 今すぐ可", color: "#16A34A", dotColor: "#16A34A", bg: "#DCFCE7", border: "#86EFAC", disabled: false };
    case "SOON":
      return { label: "◎ 15分後〜", color: "#B45309", dotColor: "#F59E0B", bg: "#FEF3C7", border: "#FCD34D", disabled: false };
    case "LATER":
      return { label: "◎ 30分後〜", color: "#B45309", dotColor: "#F59E0B", bg: "#FEF3C7", border: "#FCD34D", disabled: false };
    default: {
      const label = scheduledStart && scheduledEnd ? `${scheduledStart} 〜 ${scheduledEnd}` : "● オフライン";
      return { label, color: "#9CA3AF", dotColor: "#9CA3AF", bg: "#F3F4F6", border: "#E5E7EB", disabled: true };
    }
  }
}
