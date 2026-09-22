import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
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
  Mail,
  Phone,
  KeyRound,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  UserCheck,
  Briefcase,
  Building,
  Shield,
  Sun,
  Moon,
} from "lucide-react";

// ── Email Registration Schema (Email & Phone BOTH strictly REQUIRED) ────────
const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z
      .string()
      .min(10, "Phone number is required (min 10 digits)")
      .refine(
        (val) => {
          const clean = val.replace(/[\s\-\(\)]/g, "");
          return /^(\+91)?[6-9]\d{9}$/.test(clean) || /^\+?[1-9]\d{9,14}$/.test(clean);
        },
        "Please enter a valid mobile phone number (e.g. +91 9876543210)"
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ── Phone OTP Schema ────────────────────────────────────────────────────────
const phoneOtpSchema = z.object({
  phone: z
    .string()
    .min(8, "Please enter a valid phone number")
    .regex(/^\+?[1-9]\d{7,14}$/, "Please enter a valid phone number (e.g. +919876543210)"),
});
type PhoneOtpFormData = z.infer<typeof phoneOtpSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const toast = useToast();

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
    formState: { errors: emailErrors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Phone form
  const {
    register: registerPhone,
    handleSubmit: handleSubmitPhone,
    formState: { errors: phoneErrors },
  } = useForm<PhoneOtpFormData>({
    resolver: zodResolver(phoneOtpSchema),
  });

  // ── Email Submit (Candidate Self-Registration Only) ───────────────────────
  const onEmailSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      let formattedPhone = data.phone.trim();
      if (/^\d{10}$/.test(formattedPhone)) {
        formattedPhone = `+91${formattedPhone}`;
      }

      // 1. Register candidate (email + phone required)
      await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: formattedPhone,
      });

      // 2. Auto login
      const loginRes = await authApi.login({
        email: data.email,
        password: data.password,
      });

      await login(loginRes.access_token);
      toast.success(
        "Candidate account created successfully! Welcome to SkillAlign.",
        "Registration Complete"
      );

      // Public registration strictly routes to candidate portal
      navigate("/candidate");
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Registration failed. Please try again.";
      toast.error(errorMsg, "Registration Error");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Phone OTP Send ────────────────────────────────────────────────────────
  const onSendOtpSubmit = async (data: PhoneOtpFormData) => {
    setIsLoading(true);
    setOtpError("");
    try {
      let formattedPhone = data.phone.trim();
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

  // ── Resend OTP ────────────────────────────────────────────────────────────
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
      await login(res.access_token);
      toast.success(
        res.is_new_user
          ? "Candidate account created successfully! Welcome to SkillAlign."
          : `Welcome back, ${res.user.name}!`,
        "Registered & Signed In"
      );
      navigate("/candidate");
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
      <div className="absolute top-4 right-4 z-50">
        <motion.button
          type="button"
          onClick={toggleTheme}
          whileTap={{ scale: 0.85, rotate: 15 }}
          whileHover={{ scale: 1.05 }}
          className="theme-toggle"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <Sun className="h-4 w-4 text-amber-400" />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <Moon className="h-4 w-4 text-slate-700" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <SkillAlignLogo size="lg" showBadge badgeText="Candidate Portal" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
          className="w-full max-w-lg"
        >
        <Card className="w-full border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-2xl font-bold font-outfit">Create Candidate Profile</CardTitle>
            <CardDescription>
              Register to access talent matching and application tracking. Both email and mobile number are required for secure authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Enterprise Access Guardrail Notice */}
            <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs text-muted-foreground flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block mb-0.5">Enterprise Security Policy</span>
                HR Manager and Recruiter accounts cannot self-register. Privileged organizational accounts must be provisioned directly by your company's System Administrator.
              </div>
            </div>

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
                  <Mail className="w-4 h-4" /> Email & Phone Signup
                </TabsTrigger>
                <TabsTrigger value="phone" className="gap-2">
                  <Phone className="w-4 h-4" /> Phone OTP
                </TabsTrigger>
              </TabsList>

              {/* ── Email Registration Tab ───────────────────────────────── */}
              <TabsContent value="email" className="space-y-4 pt-2">
                <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Full Name *</label>
                    <Input
                      type="text"
                      placeholder="e.g. John Doe"
                      {...registerEmail("name")}
                      className={emailErrors.name ? "border-rose-500" : ""}
                    />
                    {emailErrors.name && (
                      <p className="text-xs text-rose-600 font-medium">{emailErrors.name.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Email Address *</label>
                      <Input
                        type="email"
                        placeholder="name@company.com"
                        {...registerEmail("email")}
                        className={emailErrors.email ? "border-rose-500" : ""}
                      />
                      {emailErrors.email && (
                        <p className="text-xs text-rose-600 font-medium">{emailErrors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                        <span>Mobile Phone *</span>
                        <span className="text-[10px] text-muted-foreground">Required</span>
                      </label>
                      <Input
                        type="tel"
                        placeholder="+91 98765 43210"
                        {...registerEmail("phone")}
                        className={emailErrors.phone ? "border-rose-500" : ""}
                      />
                      {emailErrors.phone && (
                        <p className="text-xs text-rose-600 font-medium">{emailErrors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Password *</label>
                    <Input
                      type="password"
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      {...registerEmail("password")}
                      className={emailErrors.password ? "border-rose-500" : ""}
                    />
                    {emailErrors.password && (
                      <p className="text-xs text-rose-600 font-medium">{emailErrors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Confirm Password *</label>
                    <Input
                      type="password"
                      placeholder="Re-enter password"
                      {...registerEmail("confirmPassword")}
                      className={emailErrors.confirmPassword ? "border-rose-500" : ""}
                    />
                    {emailErrors.confirmPassword && (
                      <p className="text-xs text-rose-600 font-medium">
                        {emailErrors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="gradient"
                    className="w-full h-11 text-base font-semibold mt-2 shadow-lg shadow-indigo-500/20"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating Candidate Account...
                      </>
                    ) : (
                      "Register as Candidate"
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* ── Instant Phone OTP Sign Up Tab ────────────────────────── */}
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
                        Enter your mobile number. We'll send a 6-digit OTP code to verify and instantly create your Candidate account.
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
                        <p className="text-muted-foreground">Verification code sent to:</p>
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
                        "Verify & Create Account"
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            <div className="text-center text-xs text-muted-foreground pt-2">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </HeroBackground>
  );
};

