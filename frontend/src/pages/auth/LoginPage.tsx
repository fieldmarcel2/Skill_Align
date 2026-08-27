import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { HeroBackground } from "../../components/effects/HeroBackground";
import {
  Sparkles,
  Loader2,
  Shield,
  Users,
  Briefcase,
  UserCheck,
  Mail,
  Phone,
  KeyRound,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

// ── Email Login Schema ───────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormData = z.infer<typeof loginSchema>;

// ── Phone OTP Schemas ───────────────────────────────────────────────────────
const phoneSchema = z.object({
  phone: z
    .string()
    .min(8, "Please enter a valid phone number")
    .regex(/^\+?[1-9]\d{7,14}$/, "Please enter a valid phone number in E.164 format (e.g. +919876543210)"),
});
type PhoneFormData = z.infer<typeof phoneSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Mode & Loading States
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [isLoading, setIsLoading] = useState(false);

  // OTP State Machine
  const [otpSent, setOtpSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Countdown timer effect
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Email form
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    setValue: setEmailValue,
    formState: { errors: emailErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Phone form
  const {
    register: registerPhone,
    handleSubmit: handleSubmitPhone,
    formState: { errors: phoneErrors },
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const handleRoleRedirect = (roleName: string) => {
    switch (roleName) {
      case "Admin":
        navigate("/admin");
        break;
      case "HR":
        navigate("/hr");
        break;
      case "Recruiter":
        navigate("/recruiter");
        break;
      case "Candidate":
        navigate("/candidate");
        break;
      default:
        navigate("/");
    }
  };

  // ── Email Login Submit ────────────────────────────────────────────────────
  const onEmailSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      const user = await login(res.access_token);
      toast.success(`Welcome back, ${user.name}!`, "Signed In");
      handleRoleRedirect(user.role.name);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Invalid email or password.";
      toast.error(errorMsg, "Sign In Failed");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Send OTP Submit ───────────────────────────────────────────────────────
  const onSendOtpSubmit = async (data: PhoneFormData) => {
    setIsLoading(true);
    setOtpError("");
    try {
      let formattedPhone = data.phone.trim();
      // Auto-prefix +91 if 10 digits entered without country code
      if (/^\d{10}$/.test(formattedPhone)) {
        formattedPhone = `+91${formattedPhone}`;
      }

      const res = await authApi.sendOtp({ phone: formattedPhone });
      setPhoneNumber(formattedPhone);
      setOtpSent(true);
      setCountdown(60);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
        toast.success(`Dev Mode: Code is ${res.dev_otp}`, "Verification Code");
      } else {
        toast.success(`Verification code sent to ${formattedPhone}`, "OTP Sent");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Failed to send OTP. Please check the number.";
      toast.error(errorMsg, "OTP Request Failed");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (countdown > 0 || !phoneNumber) return;
    setIsLoading(true);
    setOtpError("");
    try {
      const res = await authApi.resendOtp({ phone: phoneNumber });
      setCountdown(60);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
        toast.success(`Dev Mode: New code is ${res.dev_otp}`, "OTP Resent");
      } else {
        toast.success(`New verification code sent to ${phoneNumber}`, "OTP Resent");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Failed to resend OTP. Please wait a moment.";
      toast.error(errorMsg, "Resend Failed");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Verify OTP Submit ─────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError("Please enter the 6-digit OTP code.");
      return;
    }

    setIsLoading(true);
    setOtpError("");
    try {
      const res = await authApi.verifyOtp({
        phone: phoneNumber,
        otp: otpCode.trim(),
      });
      const user = await login(res.access_token);
      toast.success(
        res.is_new_user
          ? `Welcome to SkillAlign, ${user.name}!`
          : `Welcome back, ${user.name}!`,
        "Verified & Signed In"
      );
      handleRoleRedirect(user.role.name);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Invalid or expired OTP.";
      setOtpError(errorMsg);
      toast.error(errorMsg, "Verification Failed");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Quick Fill Demo Accounts ──────────────────────────────────────────────
  const handleQuickFill = (email: string, pass: string) => {
    setActiveTab("email");
    setEmailValue("email", email);
    setEmailValue("password", pass);
    onEmailSubmit({ email, password: pass });
  };

  return (
    <HeroBackground>
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12">
        <Link to="/" className="flex items-center gap-2.5 mb-8 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-outfit text-2xl font-bold tracking-tight text-foreground">
            Skill<span className="text-primary">Align</span>
          </span>
        </Link>

        <Card className="w-full max-w-md border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-2xl font-bold">Sign In to Your Account</CardTitle>
            <CardDescription>
              Choose your preferred sign in method below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as "email" | "phone");
                setOtpError("");
              }}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="w-4 h-4" /> Email & Password
                </TabsTrigger>
                <TabsTrigger value="phone" className="gap-2">
                  <Phone className="w-4 h-4" /> Phone OTP
                </TabsTrigger>
              </TabsList>

              {/* ── Email & Password Tab ─────────────────────────────────── */}
              <TabsContent value="email" className="space-y-4 pt-2">
                <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Email Address</label>
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      {...registerEmail("email")}
                      className={emailErrors.email ? "border-rose-500" : ""}
                    />
                    {emailErrors.email && (
                      <p className="text-xs text-rose-400">{emailErrors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">Password</label>
                    </div>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...registerEmail("password")}
                      className={emailErrors.password ? "border-rose-500" : ""}
                    />
                    {emailErrors.password && (
                      <p className="text-xs text-rose-400">{emailErrors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="gradient"
                    className="w-full h-11 text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in...
                      </>
                    ) : (
                      "Sign In with Email"
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* ── Phone Number OTP Tab ─────────────────────────────────── */}
              <TabsContent value="phone" className="space-y-4 pt-2">
                {!otpSent ? (
                  <form onSubmit={handleSubmitPhone(onSendOtpSubmit)} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                        <span>Mobile Phone Number</span>
                        <span className="text-[10px] text-muted-foreground">E.164 (e.g. +919876543210)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          placeholder="+91 98765 43210"
                          {...registerPhone("phone")}
                          className={`pl-9 ${phoneErrors.phone ? "border-rose-500" : ""}`}
                        />
                      </div>
                      {phoneErrors.phone && (
                        <p className="text-xs text-rose-400">{phoneErrors.phone.message}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        We'll send a 6-digit one-time password (OTP) via SMS. If you are new, a candidate account will be automatically set up.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      variant="gradient"
                      className="w-full h-11 text-base font-semibold gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Sending Code...
                        </>
                      ) : (
                        <>
                          Send Verification Code <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground">OTP code sent to:</p>
                        <p className="font-semibold font-mono text-foreground">{phoneNumber}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 text-primary hover:text-primary"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode("");
                          setDevOtp(null);
                          setOtpError("");
                        }}
                      >
                        Change
                      </Button>
                    </div>

                    {devOtp && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between animate-in fade-in">
                        <div className="text-xs">
                          <span className="font-semibold text-amber-600 dark:text-amber-400">⚡ Dev Mode Code: </span>
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-sm tracking-widest ml-1">{devOtp}</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 border-none font-semibold"
                          onClick={() => {
                            setOtpCode(devOtp);
                            if (otpError) setOtpError("");
                          }}
                        >
                          Auto-Fill
                        </Button>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-primary" /> Enter 6-Digit OTP Code
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setOtpCode(val);
                          if (otpError) setOtpError("");
                        }}
                        className="text-center font-mono text-xl tracking-[0.35em] font-bold h-12"
                        autoFocus
                      />
                      {otpError && <p className="text-xs text-rose-400 font-medium">{otpError}</p>}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>Didn't receive code?</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={countdown > 0 || isLoading}
                        onClick={handleResendOtp}
                        className="text-xs h-7 px-2 text-primary hover:text-primary gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                      </Button>
                    </div>

                    <Button
                      type="submit"
                      variant="gradient"
                      className="w-full h-11 text-base font-semibold gap-2"
                      disabled={isLoading || otpCode.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                        </>
                      ) : (
                        "Verify & Sign In"
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            {/* Quick 1-Click Role Login for instant reviewer testing */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
                Quick 1-Click Demo Login
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-purple-700 hover:bg-purple-100 bg-purple-50 border-purple-200 font-semibold"
                  onClick={() => handleQuickFill("admin@skillaign.dev", "Admin@123")}
                >
                  <Shield className="h-3.5 w-3.5 text-purple-600" /> Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-blue-700 hover:bg-blue-100 bg-blue-50 border-blue-200 font-semibold"
                  onClick={() => handleQuickFill("hr@skillaign.dev", "HR@12345")}
                >
                  <Users className="h-3.5 w-3.5 text-blue-600" /> HR Manager
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-emerald-700 hover:bg-emerald-100 bg-emerald-50 border-emerald-200 font-semibold"
                  onClick={() => handleQuickFill("recruiter@skillaign.dev", "Rec@12345")}
                >
                  <Briefcase className="h-3.5 w-3.5 text-emerald-600" /> Recruiter
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-amber-800 hover:bg-amber-100 bg-amber-50 border-amber-200 font-semibold"
                  onClick={() => handleQuickFill("alice@candidate.dev", "Alice@123")}
                >
                  <UserCheck className="h-3.5 w-3.5 text-amber-600" /> Candidate
                </Button>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground pt-2">
              Are you a new candidate?{" "}
              <Link to="/register" className="text-primary hover:underline font-semibold">
                Register here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </HeroBackground>
  );
};

