// =============================================================================
// TaxAce — Standalone Login Page
// Email + password auth. No external accounts required.
// Design: Forest green + amber gold, Playfair Display + DM Sans
// =============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      if (data.mfaRequired) {
        setLocation("/login/mfa");
      } else if (data.mustChangePassword) {
        setLocation("/change-password");
      } else {
        setLocation("/");
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const forgotMutation = trpc.localAuth.forgotPassword.useMutation({
    onSuccess: () => setForgotSent(true),
    onError: (err) => setError(err.message),
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate({ email, password });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    forgotMutation.mutate({ email: forgotEmail });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, oklch(0.16 0.06 155) 0%, oklch(0.20 0.07 155) 60%, oklch(0.18 0.05 155) 100%)",
      }}
    >
      {/* Background texture */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "oklch(1 0 0)",
            boxShadow: "0 25px 60px oklch(0.10 0.06 155 / 0.5), 0 8px 20px oklch(0.10 0.06 155 / 0.3)",
          }}
        >
          {/* Header band */}
          <div
            className="px-8 py-7"
            style={{
              background: "linear-gradient(135deg, oklch(0.22 0.07 155) 0%, oklch(0.18 0.06 155) 100%)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, oklch(0.75 0.14 75), oklch(0.65 0.12 75))",
                  boxShadow: "0 4px 12px oklch(0.75 0.14 75 / 0.4)",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    color: "oklch(0.18 0.06 155)",
                  }}
                >
                  TA
                </span>
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
                    fontSize: "1.3rem",
                    color: "oklch(0.97 0.008 85)",
                    lineHeight: 1.2,
                  }}
                >
                  TaxAce Group
                </p>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.65rem",
                    color: "oklch(0.65 0.05 155)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Tax Prep Operations Portal
                </p>
              </div>
            </div>
          </div>

          {/* Form area */}
          <div className="px-8 py-8">
            {!showForgot ? (
              <>
                <h2
                  className="mb-1"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
                    fontSize: "1.4rem",
                    color: "oklch(0.22 0.07 155)",
                  }}
                >
                  Welcome back
                </h2>
                <p
                  className="mb-6"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.85rem",
                    color: "oklch(0.50 0.04 155)",
                  }}
                >
                  Sign in to access your dashboard
                </p>

                {error && (
                  <div
                    className="mb-4 px-4 py-3 rounded-lg text-sm"
                    style={{
                      background: "oklch(0.97 0.02 25)",
                      border: "1px solid oklch(0.85 0.06 25)",
                      color: "oklch(0.45 0.12 25)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label
                      className="block mb-1.5 text-sm font-medium"
                      style={{ color: "oklch(0.30 0.06 155)", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Email address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="you@taxace.com"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        border: "1.5px solid oklch(0.88 0.02 155)",
                        background: "oklch(0.98 0.005 155)",
                        color: "oklch(0.20 0.06 155)",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "oklch(0.40 0.10 155)";
                        e.target.style.boxShadow = "0 0 0 3px oklch(0.40 0.10 155 / 0.12)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "oklch(0.88 0.02 155)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="block mb-1.5 text-sm font-medium"
                      style={{ color: "oklch(0.30 0.06 155)", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        aria-label="Password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="w-full px-4 py-3 pr-16 rounded-xl text-sm outline-none transition-all"
                        style={{
                          border: "1.5px solid oklch(0.88 0.02 155)",
                          background: "oklch(0.98 0.005 155)",
                          color: "oklch(0.20 0.06 155)",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "oklch(0.40 0.10 155)";
                          e.target.style.boxShadow = "0 0 0 3px oklch(0.40 0.10 155 / 0.12)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "oklch(0.88 0.02 155)";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                      <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "oklch(0.42 0.08 155)" }}>{showPassword ? "Hide" : "Show"}</button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-all mt-2"
                    style={{
                      background: loginMutation.isPending
                        ? "oklch(0.50 0.08 155)"
                        : "linear-gradient(135deg, oklch(0.28 0.09 155), oklch(0.22 0.07 155))",
                      color: "oklch(0.97 0.008 85)",
                      fontFamily: "'DM Sans', sans-serif",
                      boxShadow: loginMutation.isPending ? "none" : "0 4px 12px oklch(0.22 0.07 155 / 0.35)",
                      cursor: loginMutation.isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    {loginMutation.isPending ? "Signing in…" : "Sign In"}
                  </button>
                </form>

                <button
                  onClick={() => { setShowForgot(true); setError(null); }}
                  className="mt-4 text-sm w-full text-center"
                  style={{ color: "oklch(0.45 0.08 155)", fontFamily: "'DM Sans', sans-serif" }}
                >
                  Forgot your password?
                </button>
              </>
            ) : (
              <>
                <h2
                  className="mb-1"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
                    fontSize: "1.3rem",
                    color: "oklch(0.22 0.07 155)",
                  }}
                >
                  Reset your password
                </h2>
                <p
                  className="mb-6 text-sm"
                  style={{ color: "oklch(0.50 0.04 155)", fontFamily: "'DM Sans', sans-serif" }}
                >
                  Enter your email and we will send a reset link valid for 15 minutes.
                </p>

                {forgotSent ? (
                  <div
                    className="px-4 py-4 rounded-xl text-sm text-center"
                    style={{
                      background: "oklch(0.96 0.03 155)",
                      border: "1px solid oklch(0.80 0.06 155)",
                      color: "oklch(0.30 0.08 155)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    If that email is registered, a reset link has been sent. Check your inbox.
                  </div>
                ) : (
                  <>
                    {error && (
                      <div
                        className="mb-4 px-4 py-3 rounded-lg text-sm"
                        style={{
                          background: "oklch(0.97 0.02 25)",
                          border: "1px solid oklch(0.85 0.06 25)",
                          color: "oklch(0.45 0.12 25)",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {error}
                      </div>
                    )}
                    <form onSubmit={handleForgot} className="space-y-4">
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        placeholder="you@taxace.com"
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={{
                          border: "1.5px solid oklch(0.88 0.02 155)",
                          background: "oklch(0.98 0.005 155)",
                          color: "oklch(0.20 0.06 155)",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      />
                      <button
                        type="submit"
                        disabled={forgotMutation.isPending}
                        className="w-full py-3 rounded-xl text-sm font-semibold"
                        style={{
                          background: "linear-gradient(135deg, oklch(0.28 0.09 155), oklch(0.22 0.07 155))",
                          color: "oklch(0.97 0.008 85)",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {forgotMutation.isPending ? "Sending…" : "Send Reset Link"}
                      </button>
                    </form>
                  </>
                )}

                <button
                  onClick={() => { setShowForgot(false); setForgotSent(false); setError(null); }}
                  className="mt-4 text-sm w-full text-center"
                  style={{ color: "oklch(0.45 0.08 155)", fontFamily: "'DM Sans', sans-serif" }}
                >
                  ← Back to sign in
                </button>
              </>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-8 py-4 text-center"
            style={{
              borderTop: "1px solid oklch(0.93 0.01 155)",
              background: "oklch(0.985 0.003 155)",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.7rem",
                color: "oklch(0.65 0.03 155)",
              }}
            >
              Authorized personnel only. All access is logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
