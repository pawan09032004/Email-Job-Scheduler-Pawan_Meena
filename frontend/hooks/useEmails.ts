import { useQuery } from "@tanstack/react-query";
import { fetchEmails } from "@/lib/api";

export function useEmails(status?: "scheduled" | "sent") {
  return useQuery({
    queryKey: ["emails", status],
    queryFn: () => fetchEmails(status),
    refetchInterval: 15000,
  });
}
