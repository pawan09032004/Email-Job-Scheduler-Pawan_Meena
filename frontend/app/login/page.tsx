"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Mail, Zap, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return null;
  }

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Simplified Hero */}
      <div className="w-1/2 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-12 hidden md:flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-16 right-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-24 left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-xl flex items-center justify-center">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Email Job Scheduler</h1>
              <p className="text-sm text-indigo-200">Schedule, automate, succeed</p>
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-bold text-white mb-3">Plan and deliver emails with ease</h2>
            <p className="text-indigo-200">
              Streamlined scheduling and simple workflows to keep your campaigns on track.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
              <Zap className="w-5 h-5 text-yellow-300" />
              <div>
                <p className="text-white font-semibold text-sm">Smart scheduling</p>
                <p className="text-indigo-200 text-xs">Pick precise send times</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
              <Upload className="w-5 h-5 text-emerald-300" />
              <div>
                <p className="text-white font-semibold text-sm">Bulk uploads</p>
                <p className="text-indigo-200 text-xs">Import via CSV quickly</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-blue-300" />
              <div>
                <p className="text-white font-semibold text-sm">Clear statuses</p>
                <p className="text-indigo-200 text-xs">Scheduled, sent, failed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Email Job Scheduler
            </span>
          </div>

          {/* Login Form */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-slate-600">
              Sign in to manage your email campaigns
            </p>
          </div>

          <div className="space-y-4">
            {/* Google OAuth Button */}
            <Button
              onClick={handleGoogleSignIn}
              variant="secondary"
              size="lg"
              className="w-full shadow-lg hover:shadow-xl border-2 border-slate-200 hover:border-indigo-400"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Login with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500">
                  or sign up through email
                </span>
              </div>
            </div>

            {/* Email/Password Form (Placeholder) */}
            <div className="space-y-3 opacity-50 pointer-events-none">
              <input
                type="email"
                placeholder="Email ID"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50"
                disabled
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50"
                disabled
              />
              <button
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg font-medium"
                disabled
              >
                Login
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-slate-500">
            <p>
              By signing in, you agree to our{" "}
              <a href="#" className="text-indigo-600 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-indigo-600 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
