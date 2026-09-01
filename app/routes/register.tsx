import { Navigate } from "react-router";

export function meta() {
  return [{ title: "Sign up · Low-Carbon Value Screener" }];
}

/** Old /register links land on the signup tab of the split auth page. */
export default function RegisterRedirect() {
  return <Navigate to="/login?tab=signup" replace />;
}
