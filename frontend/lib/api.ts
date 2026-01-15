import axios from "axios";
import type { Email, QueueStats, ScheduleEmailPayload, ApiResponse } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function fetchEmails(status?: "scheduled" | "sent"): Promise<Email[]> {
  const params = status ? { status } : {};
  const response = await api.get<ApiResponse<Email[]>>("/api/emails", { params });
  return response.data.data || [];
}

export async function fetchEmailById(id: string): Promise<Email> {
  const response = await api.get<ApiResponse<Email>>(`/api/emails/${id}`);
  if (!response.data.data) {
    throw new Error("Email not found");
  }
  return response.data.data;
}

export async function fetchQueueStats(): Promise<QueueStats> {
  const response = await api.get<ApiResponse<QueueStats>>("/api/emails/stats/queue");
  return response.data.data || { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 };
}

export async function scheduleEmail(payload: ScheduleEmailPayload): Promise<Email> {
  const response = await api.post<ApiResponse<Email>>("/api/emails/schedule", payload);
  if (!response.data.data) {
    throw new Error(response.data.error || "Failed to schedule email");
  }
  return response.data.data;
}

export async function recoverFailedEmails(): Promise<{ recovered: number }> {
  const response = await api.post<ApiResponse<{ recovered: number }>>("/api/emails/recover");
  return response.data.data || { recovered: 0 };
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await api.get("/health");
    return response.data.success;
  } catch {
    return false;
  }
}
