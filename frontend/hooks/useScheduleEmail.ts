import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleEmail } from "@/lib/api";
import type { ScheduleEmailPayload } from "@/lib/types";

export function useScheduleEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ScheduleEmailPayload) => scheduleEmail(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["queue-stats"] });
    },
  });
}
