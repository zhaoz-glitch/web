import { useState, type FormEvent } from "react";
import type { Route } from "./+types/forgot-password";
import { forgotPasswordApi, resetPasswordApi } from "~/lib/api";
import { Navigate, useNavigate, Link } from "react-router";
import { useAuth } from "~/lib/auth";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "忘记密码 | 低碳价值筛选器" },
    { name: "description", content: "通过邮箱验证码重置密码" },
  ];
}

type Step = "email" | "code";

export default function ForgotPassword() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Already logged in — nothing to reset.
  if (user) {
    return <Navigate to="/" replace />;
  }

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("请输入邮箱地址");
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const msg = await forgotPasswordApi(email.trim());
      setMessage(msg);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("请输入验证码");
      return;
    }
    if (password.length < 6) {
      setError("新密码至少 6 位");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await resetPasswordApi(email.trim(), code.trim(), password);
      // All done — back to login with a hint.
      navigate("/login", {
        replace: true,
        state: { resetDone: true },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置失败");
    } finally {
      setSubmitting(false);
    }
  };

  const backToEmail = () => {
    setStep("email");
    setCode("");
    setPassword("");
    setConfirm("");
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 dark:bg-emerald-500">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              忘记密码
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              通过邮箱验证码重置登录密码
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {step === "email" ? (
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  注册邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                  placeholder="you@example.com"
                />
              </div>
              <p className="text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                我们会向该邮箱发送一封包含 6 位验证码的邮件，验证码 15 分钟内有效。
              </p>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                {submitting ? "发送中…" : "发送验证码"}
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="space-y-4">
              {message && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {message}
                </div>
              )}

              <div>
                <label
                  htmlFor="code"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  邮箱验证码
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  disabled={submitting}
                  className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-center text-base tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                  placeholder="------"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  新密码
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                  placeholder="至少 6 位"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  确认新密码
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={submitting}
                  className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                  placeholder="再次输入新密码"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                {submitting ? "提交中…" : "重置密码"}
              </button>

              <button
                type="button"
                onClick={backToEmail}
                disabled={submitting}
                className="w-full text-center text-xs text-gray-400 transition hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                ← 重新输入邮箱
              </button>
            </form>
          )}

          {/* Back to login */}
          <div className="mt-4 border-t border-gray-100 pt-3 text-center text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
            想起密码了？
            <Link
              to="/login"
              className="ml-1 font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
