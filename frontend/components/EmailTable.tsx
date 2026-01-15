"use client";

import * as React from "react";
import { useState } from "react";
import { Clock, CheckCircle, XCircle, Mail, Eye } from "lucide-react";
import { useEmails } from "@/hooks/useEmails";
import { TableSkeleton } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { Email } from "@/lib/types";
import { EmailDetailsModal } from "@/components/EmailDetailsModal";

export function EmailTable() {
  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">("scheduled");
  const { data: emails, isLoading } = useEmails(activeTab);

  const tabs = [
    { id: "scheduled" as const, label: "Scheduled", icon: Clock },
    { id: "sent" as const, label: "Sent", icon: CheckCircle },
  ];

  const displayEmails = (() => {
    if (!emails) return [];
    const items = [...emails];
    if (activeTab === "sent") {
      items.sort((a, b) => {
        const ad = new Date(a.sentAt || a.scheduledAt).getTime();
        const bd = new Date(b.sentAt || b.scheduledAt).getTime();
        return bd - ad; // recent first
      });
    } else {
      items.sort((a, b) => {
        const ad = new Date(a.scheduledAt).getTime();
        const bd = new Date(b.scheduledAt).getTime();
        return bd - ad; // recent scheduled first
      });
    }
    return items;
  })();

  return (
    <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-6">
      <DetailsStateProvider>
      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300
                  ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : displayEmails.length === 0 ? (
        <EmptyState
          icon={<Mail className="w-8 h-8" />}
          title={`No ${activeTab} emails`}
          description={
            activeTab === "scheduled"
              ? "Schedule your first email to get started"
              : "No emails have been sent yet"
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  To
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Subject
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  {activeTab === "scheduled" ? "Scheduled For" : "Sent At"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayEmails.map((email, index) => (
                <EmailRow key={email.id} email={email} index={index} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      </DetailsStateProvider>
    </div>
  );
}

function EmailRow({ email, index }: { email: Email; index: number }) {
  const [showActions, setShowActions] = useState(false);
  const { openDetails } = useDetailsState();

  const statusConfig = {
    scheduled: {
      icon: Clock,
      className: "bg-yellow-100 text-yellow-800",
      label: "Scheduled",
    },
    sent: {
      icon: CheckCircle,
      className: "bg-green-100 text-green-800",
      label: "Sent",
    },
    failed: {
      icon: XCircle,
      className: "bg-red-100 text-red-800",
      label: "Failed",
    },
  };

  const status = statusConfig[email.status];
  const StatusIcon = status.icon;

  return (
    <tr
      className="border-b border-slate-100 hover:bg-indigo-50 transition-all duration-200 even:bg-slate-50"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{
        animation: `slide-up 0.3s ease-out ${index * 0.05}s both`,
      }}
    >
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {email.toEmail[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium text-slate-900">
            {email.toEmail}
          </span>
        </div>
      </td>
      <td className="py-4 px-4">
        <p className="text-sm text-slate-900 truncate max-w-xs">
          {email.subject}
        </p>
      </td>
      <td className="py-4 px-4">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.className}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </td>
      <td className="py-4 px-4">
        <div className="text-sm">
          <p className="text-slate-900">
            {formatRelativeTime(
              email.status === "sent" && email.sentAt
                ? email.sentAt
                : email.scheduledAt
            )}
          </p>
          <p className="text-xs text-slate-500">
            {formatDate(
              email.status === "sent" && email.sentAt
                ? email.sentAt
                : email.scheduledAt
            )}
          </p>
        </div>
      </td>
      <td className="py-4 px-4">
        <div
          className={`flex items-center gap-2 transition-opacity duration-200 ${
            showActions ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 transition-colors"
            title="View details"
            onClick={() => openDetails(email)}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Local state container with hook to open details
function DetailsStateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Email | null>(null);
  const value = {
    openDetails: (email: Email) => {
      setSelected(email);
      setOpen(true);
    },
  };
  return (
    <DetailsContext.Provider value={value}>
      {children}
      <EmailDetailsModal isOpen={open} onClose={() => setOpen(false)} email={selected} />
    </DetailsContext.Provider>
  );
}

const DetailsContext = React.createContext<{ openDetails: (email: Email) => void } | null>(
  null
);

function useDetailsState() {
  const ctx = React.useContext(DetailsContext);
  if (!ctx) throw new Error("useDetailsState must be used within DetailsStateProvider");
  return ctx;
}
