import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router";

import { useEffect, type ReactNode } from "react";
import type { Route } from "./+types/root";
import { AuthProvider, useAuth } from "~/lib/auth";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGuard />
    </AuthProvider>
  );
}

/**
 * Route guard — gates the entire app on auth state.
 *
 * - authRestored === false → full-screen spinner (we don't know yet
 *   whether the user is logged in, so don't flash the login page).
 * - authRestored === true, no user, not on /login, /register or /forgot-password → redirect to /login.
 * - authRestored === true, has user, on a public auth page → redirect to /.
 * - Otherwise → render the matched route via <Outlet />.
 */
function AuthGuard() {
  const { user, authRestored } = useAuth();
  const location = useLocation();
  const isPublicRoute =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/forgot-password";

  // Still restoring — show a loading spinner
  if (!authRestored) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-500"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              opacity="0.25"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Loading…
          </span>
        </div>
      </div>
    );
  }

  // Restored but not logged in — send to login (unless on a public page)
  if (!user && !isPublicRoute) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but on a public auth page — send to home
  if (user && isPublicRoute) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
