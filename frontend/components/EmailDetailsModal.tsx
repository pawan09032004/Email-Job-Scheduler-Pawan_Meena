import { Modal } from "@/components/ui/Modal";
import type { Email } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Mail } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  email: Email | null;
}

export function EmailDetailsModal({ isOpen, onClose, email }: Props) {
  if (!email) return null;

  const metaItems = [
    { label: "To", value: email.toEmail },
    { label: "From", value: email.senderEmail },
    { label: "Status", value: email.status },
    {
      label: email.status === "sent" ? "Sent At" : "Scheduled For",
      value: formatDate(
        email.status === "sent" && email.sentAt ? email.sentAt : email.scheduledAt
      ),
    },
    { label: "Created", value: formatDate(email.createdAt) },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email Details" size="lg">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Subject</p>
            <h3 className="text-lg font-semibold text-slate-900">{email.subject}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {metaItems.map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="text-sm font-medium text-slate-900 break-words">{item.value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-sm text-slate-500 mb-2">Message</p>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <pre className="whitespace-pre-wrap break-words text-slate-900 text-sm">
              {email.body}
            </pre>
          </div>
        </div>
      </div>
    </Modal>
  );
}

