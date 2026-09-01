import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { BrandPanel } from "~/components/BrandPanel";
import { loginApi, registerApi } from "~/lib/api";
import { useAuth } from "~/lib/auth";

export function meta() {
  return [{ title: "Sign in · Low-Carbon Value Screener" }];
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [stage, setStage] = useState<"signin" | "signup">(
    searchParams.get("tab") === "signup" ? "signup" : "signin",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter email and password");
      return;
    }
    if (stage === "signup" && !name.trim()) {
      setError("Enter your name");
      return;
    }

    setSubmitting(true);
    try {
      const result =
        stage === "signin"
          ? await loginApi(email.trim(), password)
          : await registerApi(email.trim(), password, name.trim());
      login(result.token, result.user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-surface">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center overflow-y-auto p-6 sm:p-10">
        <div className="my-8 w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Welcome to GreenScreener
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-900">
              {stage === "signin" ? "Welcome back" : "Create an account"}
            </h2>
            <p className="text-sm text-ink-500">
              {stage === "signin"
                ? "Sign in to use the Low-Carbon Value Screener"
                : "After sign-up you’ll be signed in and taken to the screener"}
            </p>
          </div>

          <div className="flex rounded-2xl bg-ink-100/70 p-1">
            <button
              type="button"
              onClick={() => { setStage("signin"); setError(""); }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
                stage === "signin" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setStage("signup"); setError(""); }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
                stage === "signup" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {stage === "signup" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="glass-input"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@university.edu"
                className="glass-input"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-ink-700">Password</label>
                {stage === "signin" && (
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-accent hover:text-emerald-700"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder={stage === "signup" ? "At least 6 characters" : "Enter password"}
                className="glass-input"
                autoComplete={stage === "signin" ? "current-password" : "new-password"}
                required
              />
            </div>

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Please wait…" : stage === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="rounded-2xl border border-dashed border-ink-200 bg-white/60 px-4 py-3 text-xs text-ink-500">
            Classroom demo:
            <span className="ml-1 font-medium text-ink-800">demo@lowcarbon.io</span>
            {" / "}
            <span className="font-medium text-ink-800">demo123456</span>
          </div>
        </div>
      </div>
    </div>
  );
}
