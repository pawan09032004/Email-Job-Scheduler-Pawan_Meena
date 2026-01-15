"use client";

import { Clock, Zap, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useQueueStats } from "@/hooks/useQueueStats";
import { Shimmer } from "@/components/ui/Loader";
import { cn } from "@/lib/utils";

const statCards = [
  {
    key: "waiting" as const,
    label: "Waiting",
    icon: Clock,
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50",
    iconColor: "text-blue-600",
  },
  {
    key: "active" as const,
    label: "Active",
    icon: Zap,
    gradient: "from-emerald-500 to-green-500",
    bgGradient: "from-emerald-50 to-green-50",
    iconColor: "text-emerald-600",
  },
  {
    key: "delayed" as const,
    label: "Delayed",
    icon: AlertCircle,
    gradient: "from-amber-500 to-orange-500",
    bgGradient: "from-amber-50 to-orange-50",
    iconColor: "text-amber-600",
  },
  {
    key: "completed" as const,
    label: "Completed",
    icon: CheckCircle,
    gradient: "from-emerald-500 to-teal-500",
    bgGradient: "from-emerald-50 to-teal-50",
    iconColor: "text-emerald-600",
  },
  {
    key: "failed" as const,
    label: "Failed",
    icon: XCircle,
    gradient: "from-rose-500 to-red-500",
    bgGradient: "from-rose-50 to-red-50",
    iconColor: "text-rose-600",
  },
];

export function QueueStats() {
  const { data: stats, isLoading } = useQueueStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card) => (
          <Shimmer key={card.key} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {statCards.map((card) => {
        const Icon = card.icon;
        const value = stats?.[card.key] || 0;

        return (
          <div
            key={card.key}
            className={cn(
              "relative overflow-hidden rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer",
              `bg-gradient-to-br ${card.bgGradient}`
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  `bg-gradient-to-br ${card.gradient}`
                )}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">
                {card.label}
              </p>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
            </div>

            {/* Decorative circle */}
            <div
              className={cn(
                "absolute -bottom-8 -right-8 w-24 h-24 rounded-full opacity-20",
                `bg-gradient-to-br ${card.gradient}`
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
