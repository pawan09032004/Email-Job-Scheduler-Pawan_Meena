export interface Email {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  senderEmail: string;
  status: EmailStatus;
  createdAt: string;
  sentAt?: string;
  error?: string;
}

export type EmailStatus = "scheduled" | "sent" | "failed";

export interface QueueStats {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
}

export interface ScheduleEmailPayload {
  toEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  senderEmail: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
