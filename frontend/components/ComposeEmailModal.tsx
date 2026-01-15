"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import {
  Mail,
  User,
  Calendar,
  Clock,
  Shield,
  Upload,
  Send,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { useScheduleEmail } from "@/hooks/useScheduleEmail";
import { parseCSV, type ParsedEmail } from "@/lib/utils";
import type { ScheduleEmailPayload } from "@/lib/types";

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface FormData {
  toEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  senderEmail: string;
  delayBetweenEmails?: number;
  hourlyLimit?: number;
}

export function ComposeEmailModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
}: ComposeEmailModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedEmails, setParsedEmails] = useState<ParsedEmail[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const { data: session } = useSession();

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>();
  const { mutate: scheduleEmail, isPending } = useScheduleEmail();

  useEffect(() => {
    if (session?.user?.email) {
      setValue("senderEmail", session.user.email, { shouldValidate: true });
    }
  }, [session?.user?.email, setValue]);

  const handleFileSelect = async (file: File) => {
    try {
      setCsvFile(file);
      const emails = await parseCSV(file);
      setParsedEmails(emails);
      setIsBulkMode(true);
      onSuccess(`Parsed ${emails.length} emails from CSV`);
    } catch (error) {
      onError("Failed to parse CSV file");
      setCsvFile(null);
      setParsedEmails([]);
    }
  };

  const handleClearFile = () => {
    setCsvFile(null);
    setParsedEmails([]);
    setIsBulkMode(false);
  };

  const onSubmit = (data: FormData) => {
    const scheduledAt = new Date(data.scheduledAt).toISOString();

    if (isBulkMode && parsedEmails.length > 0) {
      // Schedule multiple emails
      let scheduled = 0;
      parsedEmails.forEach((email, index) => {
        const payload: ScheduleEmailPayload = {
          toEmail: email.toEmail,
          subject: email.subject || data.subject,
          body: email.body || data.body,
          scheduledAt,
          senderEmail: data.senderEmail,
        };

        scheduleEmail(payload, {
          onSuccess: () => {
            scheduled++;
            if (scheduled === parsedEmails.length) {
              onSuccess(`Successfully scheduled ${scheduled} emails`);
              handleClose();
            }
          },
          onError: () => {
            onError(`Failed to schedule email for ${email.toEmail}`);
          },
        });
      });
    } else {
      // Schedule single email
      const payload: ScheduleEmailPayload = {
        toEmail: data.toEmail,
        subject: data.subject,
        body: data.body,
        scheduledAt,
        senderEmail: data.senderEmail,
      };

      scheduleEmail(payload, {
        onSuccess: () => {
          onSuccess("Email scheduled successfully!");
          handleClose();
        },
        onError: () => {
          onError("Failed to schedule email");
        },
      });
    }
  };

  const handleClose = () => {
    reset();
    setCsvFile(null);
    setParsedEmails([]);
    setIsBulkMode(false);
    onClose();
  };

  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Compose New Email" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* CSV Upload Section */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Bulk Upload (Optional)</h3>
          </div>
          <FileUpload
            onFileSelect={handleFileSelect}
            selectedFile={csvFile}
            onClear={handleClearFile}
          />
          {parsedEmails.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Parsed Emails
                </span>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                  {parsedEmails.length} emails
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 bg-white rounded-lg p-2 border border-slate-200">
                {parsedEmails.slice(0, 10).map((email, index) => (
                  <div
                    key={index}
                    className="text-xs text-slate-600 flex items-center gap-2"
                  >
                    <Mail className="w-3 h-3 text-indigo-500" />
                    {email.toEmail}
                  </div>
                ))}
                {parsedEmails.length > 10 && (
                  <p className="text-xs text-slate-500 italic">
                    +{parsedEmails.length - 10} more...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Email Details Section */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Email Details</h3>
          </div>

          {!isBulkMode && (
            <Input
              label="To Email"
              type="email"
              placeholder="recipient@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.toEmail?.message}
              {...register("toEmail", {
                required: !isBulkMode && "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
            />
          )}

          <Input
            label="Subject"
            placeholder="Email subject"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.subject?.message}
            {...register("subject", { required: "Subject is required" })}
          />

          <Textarea
            label="Body"
            placeholder="Type your message here..."
            rows={6}
            showCharCount
            maxCharCount={5000}
            error={errors.body?.message}
            {...register("body", { required: "Body is required" })}
          />
        </div>

        {/* Scheduling Section */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Scheduling</h3>
          </div>

          <Input
            label="Sender Email"
            type="email"
            placeholder="sender@example.com"
            leftIcon={<User className="w-4 h-4" />}
            error={errors.senderEmail?.message}
            {...register("senderEmail", {
              required: "Sender email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            })}
          />

          <Input
            label="Scheduled Time"
            type="datetime-local"
            min={minDateTime}
            leftIcon={<Calendar className="w-4 h-4" />}
            error={errors.scheduledAt?.message}
            {...register("scheduledAt", {
              required: "Scheduled time is required",
              validate: (value) => {
                const scheduled = new Date(value);
                const now = new Date();
                return scheduled > now || "Scheduled time must be in the future";
              },
            })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Delay Between Emails (seconds)"
              type="number"
              placeholder="0"
              leftIcon={<Clock className="w-4 h-4" />}
              {...register("delayBetweenEmails", { valueAsNumber: true })}
            />

            <Input
              label="Hourly Limit"
              type="number"
              placeholder="0"
              leftIcon={<Shield className="w-4 h-4" />}
              {...register("hourlyLimit", { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isPending}
            icon={<Send className="w-4 h-4" />}
          >
            Schedule Email{isBulkMode && "s"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
