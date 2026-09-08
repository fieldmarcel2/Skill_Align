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
import { SkillAlignLogo } from "../../components/common/SkillAlignLogo";
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
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

// ── Email Login Schema ───────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().min(1, "Please enter your email or phone number"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormData = z.infer<typeof loginSchema>;

// ── Phone OTP Schemas ───────────────────────────────────────────────────────
const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, "Please enter at least 10 digits")
    .regex(/^[\d\s+\-()]{10,20}$/, "Please enter a valid phone number (e.g. 9876543210 or +91 9876543210)"),
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
      const cleanData = {
        email: data.email.trim(),
        password: data.password,
      };
      const res = await authApi.login(cleanData);
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

  // ── Quick Role Login (Admin, HR, Recruiter) ────────────────────────────────
  const handleQuickRoleLogin = async (email: string, password: string) => {
    setEmailValue("email", email);
    setEmailValue("password", password);
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password });
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
      let formattedPhone = data.phone.trim().replace(/[\s\-()]/g, "");
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

  return (
    <HeroBackground>
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12">
        <div className="mb-8">
          <SkillAlignLogo size="lg" showBadge badgeText="Portal" />
        </div>

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
                        <span>Registered Mobile Phone</span>
                        <span className="text-[10px] text-muted-foreground font-mono">e.g. +91 98765 43210</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="h-10 px-3 rounded-lg border border-border/80 bg-secondary/40 flex items-center gap-1.5 text-xs font-semibold text-foreground shrink-0 select-none">
                          <span>🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="98765 43210"
                            {...registerPhone("phone")}
                            className={`pl-9 ${phoneErrors.phone ? "border-rose-500" : ""}`}
                          />
                        </div>
                      </div>
                      {phoneErrors.phone && (
                        <p className="text-xs text-rose-400 font-medium">{phoneErrors.phone.message}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        We will send a cryptographically secure 6-digit one-time password (OTP).
                      </p>
                    </div>

                    <Button
                      type="submit"
                      variant="gradient"
                      className="w-full h-11 text-base font-semibold gap-2 shadow-md shadow-indigo-500/20"
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
                    <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs flex items-center justify-between">
                      <div>
                        <p className="text-indigo-300/80 text-[11px]">OTP verification sent to:</p>
                        <p className="font-semibold font-mono text-white text-sm">{phoneNumber}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 font-semibold"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode("");
                          setDevOtp(null);
                          setOtpError("");
                        }}
                      >
                        Change Number
                      </Button>
                    </div>

                    {devOtp && (
                      <div className="p-3.5 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 rounded-xl flex items-center justify-between shadow-lg shadow-indigo-950/40 animate-in fade-in">
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[11px]">
                            <MessageSquare className="w-3.5 h-3.5" /> SMS Delivered
                          </div>
                          <p className="text-slate-300 text-[11px]">
                            Code: <span className="font-mono font-black text-white text-base tracking-widest ml-1">{devOtp}</span>
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 font-bold px-3"
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
                        className="text-center font-mono text-xl tracking-[0.35em] font-bold h-12 bg-background/80 border-indigo-500/30 focus:border-indigo-500"
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
                        className="text-xs h-7 px-2.5 text-primary hover:text-primary gap-1 font-semibold"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                      </Button>
                    </div>

                    <Button
                      type="submit"
                      variant="gradient"
                      className="w-full h-11 text-base font-semibold gap-2 shadow-md shadow-indigo-500/20"
                      disabled={isLoading || otpCode.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Verifying Code...
                        </>
                      ) : (
                        <>
                          Verify & Sign In <CheckCircle2 className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            {/* ── Quick Role Login for Admin / HR / Recruiter ───────────── */}
            <div className="pt-4 border-t border-border/60">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Instant Role Access
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">1-Click Dev Fill</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleQuickRoleLogin("admin@skillaign.dev", "Admin@123")}
                  className="h-auto py-2 px-1.5 flex flex-col items-center gap-1 border-purple-500/40 bg-purple-950/20 hover:border-purple-500 hover:bg-purple-500/15 text-purple-300 rounded-xl transition-all shadow-sm"
                >
                  <Shield className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">Admin</span>
                  <span className="text-[9px] text-purple-300/70 truncate max-w-full font-mono">admin@...</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleQuickRoleLogin("hr@skillaign.dev", "HR@12345")}
                  className="h-auto py-2 px-1.5 flex flex-col items-center gap-1 border-blue-500/40 bg-blue-950/20 hover:border-blue-500 hover:bg-blue-500/15 text-blue-300 rounded-xl transition-all shadow-sm"
                >
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-white">HR Manager</span>
                  <span className="text-[9px] text-blue-300/70 truncate max-w-full font-mono">hr@...</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleQuickRoleLogin("recruiter@skillalign.dev", "Pass@123")}
                  className="h-auto py-2 px-1.5 flex flex-col items-center gap-1 border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-500 hover:bg-emerald-500/15 text-emerald-300 rounded-xl transition-all shadow-sm"
                >
                  <Briefcase className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Recruiter</span>
                  <span className="text-[9px] text-emerald-300/70 truncate max-w-full font-mono">recruiter@...</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleQuickRoleLogin("shiva4850t@gmail.com", "Password123!")}
                  className="h-auto py-2 px-1.5 flex flex-col items-center gap-1 border-amber-500/40 bg-amber-950/20 hover:border-amber-500 hover:bg-amber-500/15 text-amber-300 rounded-xl transition-all shadow-sm"
                >
                  <UserCheck className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Candidate</span>
                  <span className="text-[9px] text-amber-300/70 truncate max-w-full font-mono">shiva@...</span>
                </Button>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/40">
              Are you a new candidate?{" "}
              <Link to="/register" className="text-primary hover:underline font-semibold">
                Register as Candidate
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </HeroBackground>
  );
};

