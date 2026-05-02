import { AlertTriangle, ArrowRight, Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { ERTLoginRequest } from "../services/auth";
import { BeaconLogo } from "./atoms/BeaconLogo";

interface LoginProps {
  onLoginSuccess: () => void;
}

// Static particles - positions fixed at build time to avoid hydration/re-render flicker
const PARTICLES = [
  { left: "12%", top: "18%", color: "#2563EB" },
  { left: "25%", top: "72%", color: "#9333EA" },
  { left: "38%", top: "35%", color: "#64D2FF" },
  { left: "55%", top: "88%", color: "#2563EB" },
  { left: "67%", top: "14%", color: "#9333EA" },
  { left: "78%", top: "55%", color: "#64D2FF" },
  { left: "15%", top: "45%", color: "#9333EA" },
  { left: "42%", top: "62%", color: "#2563EB" },
  { left: "83%", top: "30%", color: "#2563EB" },
  { left: "20%", top: "90%", color: "#64D2FF" },
  { left: "60%", top: "42%", color: "#9333EA" },
  { left: "72%", top: "78%", color: "#2563EB" },
  { left: "33%", top: "22%", color: "#64D2FF" },
  { left: "88%", top: "65%", color: "#9333EA" },
  { left: "50%", top: "10%", color: "#2563EB" },
];

export function Login({ onLoginSuccess }: LoginProps) {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState<ERTLoginRequest>({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(credentials);
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Orbit ring animation - injected once */}
      <style>{`
        @keyframes beacon-orbit {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes beacon-pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0;    transform: scale(1.6); }
        }
        @keyframes beacon-pulse-outer {
          0%, 100% { opacity: 0.08; transform: scale(1); }
          50%       { opacity: 0.02; transform: scale(1.3); }
        }
        @keyframes beacon-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>

      <div className="flex h-screen w-full" style={{ background: "#050505" }}>
        {/* ── Left: Cinematic Visual Panel ───────────────────────── */}
        <div className="hidden lg:flex relative flex-1 items-center justify-center overflow-hidden">
          {/* Deep dark base */}
          <div className="absolute inset-0" style={{ background: "#050508" }} />

          {/* Radar mesh grid */}
          <div
            className="absolute inset-0"
            style={{
              opacity: 0.035,
              backgroundImage: `
                linear-gradient(rgba(37,99,235,0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(37,99,235,0.5) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px",
            }}
          />

          {/* Orbit rings */}
          {[180, 280, 400, 540].map((size, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                top: "50%",
                left: "50%",
                border: `1px solid rgba(37, 99, 235, ${0.06 - i * 0.01})`,
                animation: `beacon-orbit ${60 + i * 20}s linear infinite`,
              }}
            >
              {/* Orbiting dot */}
              <div
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: i % 2 === 0 ? "#2563EB" : "#9333EA",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%) translateY(-50%)",
                  boxShadow: `0 0 10px ${i % 2 === 0 ? "rgba(37,99,235,0.6)" : "rgba(147,51,234,0.6)"}`,
                }}
              />
            </div>
          ))}

          {/* Central beacon */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Pulse rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-28 h-28 rounded-full"
                style={{
                  background: "radial-gradient(circle, #2563EB, transparent)",
                  animation: "beacon-pulse 3s ease-in-out infinite",
                }}
              />
            </div>
            <div
              className="absolute w-60 h-60 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, #9333EA, transparent)",
                animation: "beacon-pulse-outer 4s ease-in-out infinite 0.5s",
              }}
            />

            {/* Icon box */}
            <div
              className="relative w-20 h-20 rounded-[22px] flex items-center justify-center"
              style={{
                animation: "beacon-float 6s ease-in-out infinite",
              }}
            >
              <BeaconLogo className="h-20 w-20" />
            </div>

            <div className="mt-8 text-center">
              <h1
                className="text-white"
                style={{
                  fontSize: "38px",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                Beacon
              </h1>
              <p style={{ color: "#8A8F98", fontSize: "15px", marginTop: 6 }}>
                Emergency Response Platform
              </p>
            </div>
          </div>

          {/* Static ambient particles */}
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full pointer-events-none"
              style={{
                background: p.color,
                opacity: 0.2,
                left: p.left,
                top: p.top,
              }}
            />
          ))}

          {/* Bottom fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{
              background: "linear-gradient(to top, #050508, transparent)",
            }}
          />
        </div>

        {/* ── Right: Login Form Panel ─────────────────────────────── */}
        <div
          className="w-full lg:w-[520px] xl:w-[560px] flex flex-col items-center justify-center px-6 lg:px-16 relative shrink-0"
          style={{ background: "var(--background)" }}
        >
          {/* Subtle left border */}
          <div
            className="hidden lg:block absolute left-0 top-0 bottom-0 w-[1px]"
            style={{
              background:
                "linear-gradient(to bottom, transparent, var(--border) 30%, var(--border) 70%, transparent)",
            }}
          />

          <div className="w-full max-w-[380px]">
            {/* Mobile logo */}
            <div className="flex lg:hidden flex-col items-center mb-10">
              <div
                className="w-14 h-14 rounded-[16px] flex items-center justify-center mb-4"
              >
                <BeaconLogo />
              </div>
              <h1
                className="text-foreground"
                style={{ fontSize: "28px", fontWeight: 800 }}
              >
                Beacon
              </h1>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h2
                className="text-foreground"
                style={{
                  fontSize: "26px",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                Welcome back
              </h2>
              <p
                style={{
                  color: "var(--muted-foreground)",
                  fontSize: "14px",
                  marginTop: 6,
                }}
              >
                Sign in to access the command center
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div
                className="flex items-start gap-3 p-3.5 rounded-[12px] mb-5"
                style={{
                  background: "rgba(255,69,58,0.08)",
                  border: "1px solid rgba(255,69,58,0.2)",
                }}
                role="alert"
                aria-live="assertive"
              >
                <AlertTriangle
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: "#FF453A" }}
                  aria-hidden="true"
                />
                <span style={{ color: "#FF453A", fontSize: "13px" }}>
                  {error}
                </span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div>
                <label
                  htmlFor="beacon-username"
                  className="block mb-2 pl-0.5"
                  style={{
                    color:
                      focusedField === "username"
                        ? "var(--text-secondary)"
                        : "var(--muted-foreground)",
                    fontSize: "13px",
                    fontWeight: 500,
                    transition: "color 0.2s",
                  }}
                >
                  Username
                </label>
                <input
                  id="beacon-username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="operator@beacon.gov"
                  className="w-full h-[48px] px-4 rounded-[12px] text-foreground placeholder-muted-foreground focus:outline-none transition-all duration-200"
                  style={{
                    background: "var(--input-background)",
                    border: `1px solid ${focusedField === "username" ? "#2563EB" : "var(--secondary)"}`,
                    boxShadow:
                      focusedField === "username"
                        ? "0 0 0 3px rgba(37,99,235,0.1), 0 0 20px rgba(37,99,235,0.05)"
                        : "none",
                    fontSize: "14px",
                  }}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="beacon-password"
                  className="pl-0.5"
                  style={{
                    color:
                      focusedField === "password"
                        ? "var(--text-secondary)"
                        : "var(--muted-foreground)",
                    fontSize: "13px",
                    fontWeight: 500,
                    transition: "color 0.2s",
                  }}
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="beacon-password"
                    type={showPassword ? "text" : "password"}
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    placeholder="Enter your password"
                    className="w-full h-[48px] px-4 pr-12 rounded-[12px] text-foreground placeholder-muted-foreground focus:outline-none transition-all duration-200"
                    style={{
                      background: "var(--input-background)",
                      border: `1px solid ${focusedField === "password" ? "#2563EB" : "var(--secondary)"}`,
                      boxShadow:
                        focusedField === "password"
                          ? "0 0 0 3px rgba(37,99,235,0.1), 0 0 20px rgba(37,99,235,0.05)"
                          : "none",
                      fontSize: "14px",
                    }}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-[6px] flex items-center justify-center hover:bg-secondary transition-colors"
                    disabled={isLoading}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        className="w-4 h-4"
                        style={{ color: "var(--muted-foreground)" }}
                        aria-hidden="true"
                      />
                    ) : (
                      <Eye
                        className="w-4 h-4"
                        style={{ color: "var(--muted-foreground)" }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[48px] rounded-[12px] text-white flex items-center justify-center gap-2.5 transition-all duration-200 hover:brightness-110 active:scale-[0.99] mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #1a4fd4 100%)",
                  boxShadow:
                    "0 0 30px rgba(37,99,235,0.2), 0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {isLoading ? (
                  <>
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin shrink-0"
                      aria-hidden="true"
                    />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In to Command Center
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/* Security footer */}
            <div
              className="mt-8 pt-6 space-y-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <p
                className="text-center"
                style={{ color: "var(--muted-foreground)", fontSize: "11px" }}
              >
                Authorized personnel only. All access attempts are monitored and
                recorded.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
