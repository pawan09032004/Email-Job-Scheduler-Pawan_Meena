import { useQuery } from "@tanstack/react-query";
import { fetchQueueStats } from "@/lib/api";

export function useQueueStats() {
  return useQuery({
    queryKey: ["queue-stats"],
    queryFn: fetchQueueStats,
    refetchInterval: 10000,
  });
}
