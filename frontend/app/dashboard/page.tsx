"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Header } from "@/components/Header";
import { EmailTable } from "@/components/EmailTable";
import { ComposeEmailModal } from "@/components/ComposeEmailModal";
import { ToastContainer } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/hooks/useToast";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const { toasts, removeToast, success, error } = useToast();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Welcome back, {session.user?.name?.split(" ")[0] || "User"}!
          </h1>
          <p className="text-slate-600">{currentDate}</p>
        </div>

        <div className="relative animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="absolute -top-4 right-0 z-10">
            <Button
              onClick={() => setIsComposeOpen(true)}
              variant="primary"
              size="lg"
              icon={<Plus className="w-5 h-5" />}
              className="shadow-xl hover:shadow-2xl animate-pulse"
            >
              Compose Email
            </Button>
          </div>

          <EmailTable />
        </div>
      </main>

      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={success}
        onError={error}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
