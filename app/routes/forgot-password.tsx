import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { BrandPanel } from "~/components/BrandPanel";
import { forgotPasswordApi, resetPasswordApi } from "~/lib/api";
import { useAuth } from "~/lib/auth";

export function meta() {
  return [{ title: "Reset password · Low-Carbon Value Screener" }];
}

type Step = "email" | "code" | "password" | "success";

export default function ForgotPasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter the email that should receive the code");
      return;
    }

    setSubmitting(true);
    try {
      await forgotPasswordApi(email.trim());
      setDevCode(null);
      setStep("code");
      setCountdown(60);
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    setError("");
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((c) => c !== "")) {
      void handleVerifyCode(next.join(""));
    }
  };

  const handleCodeKeyDown = (
    index: number,
    e: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const next = [...code];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);
    setError("");
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) void handleVerifyCode(pasted);
  };

  const handleVerifyCode = (fullCode: string) => {
    if (fullCode.length !== 6) return;
    setError("");
    setStep("password");
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await resetPasswordApi(email.trim(), code.join(""), newPassword);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-surface">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center overflow-y-auto p-6 sm:p-10">
        <div className="my-8 w-full max-w-md space-y-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to sign in
          </Link>

          {step === "email" && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
                  Reset password
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-900">
                  Email a verification code
                </h2>
                <p className="text-sm text-ink-500">
                  Enter the email you signed up with. We’ll send a 6-digit code.
                </p>
              </div>
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="you@example.com"
                    className="glass-input"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm font-medium text-red-500">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full"
                >
                  {submitting ? "Sending…" : "Send code"}
                </button>
              </form>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
                  Check your inbox
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-900">
                  Enter the code
                </h2>
                <p className="text-sm text-ink-500">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-ink-700">{email}</span>
                </p>
              </div>

              {devCode && (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                  Mail is not configured in this environment. Code:
                  <span className="ml-1 font-mono text-sm font-bold tracking-widest">
                    {devCode}
                  </span>
                </div>
              )}

              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    disabled={submitting}
                    className="h-14 w-12 rounded-2xl border-2 border-ink-200 bg-white text-center text-xl font-bold text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 sm:h-16 sm:w-14"
                  />
                ))}
              </div>

              {error && (
                <p className="text-center text-sm font-medium text-red-500">
                  {error}
                </p>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => handleSendCode()}
                  disabled={countdown > 0 || submitting}
                  className="text-sm text-accent hover:text-emerald-700 disabled:text-ink-400"
                >
                  {countdown > 0
                    ? `Resend in ${countdown}s`
                    : "Didn’t get it? Resend"}
                </button>
              </div>
            </div>
          )}

          {step === "password" && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
                  Verified
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-900">
                  Set a new password
                </h2>
                <p className="text-sm text-ink-500">Use at least 6 characters.</p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    New password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-input"
                    autoComplete="new-password"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-input"
                    autoComplete="new-password"
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm font-medium text-red-500">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full"
                >
                  {submitting ? "Updating…" : "Reset password"}
                </button>
              </form>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-ink-900">
                  Password updated
                </h2>
                <p className="text-sm text-ink-500">
                  Sign in with your new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="btn-primary w-full"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
