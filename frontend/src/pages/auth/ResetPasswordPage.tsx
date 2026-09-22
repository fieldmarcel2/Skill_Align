import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { authApi } from "../../services/api";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { HeroBackground } from "../../components/effects/HeroBackground";
import { SkillAlignLogo } from "../../components/common/SkillAlignLogo";
import { useTheme } from "../../context/ThemeContext";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter")
      .regex(/[a-z]/, "Password must include at least one lowercase letter")
      .regex(/\d/, "Password must include at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const toast = useToast();
  const { toggleTheme, isDark } = useTheme();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
  });

  const watchedPassword = watch("password", "");

  // Password criteria indicators
  const criteria = [
    { label: "At least 8 characters", met: watchedPassword.length >= 8 },
    { label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(watchedPassword) },
    { label: "One lowercase letter (a-z)", met: /[a-z]/.test(watchedPassword) },
    { label: "One number (0-9)", met: /\d/.test(watchedPassword) },
  ];

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error("Missing password reset token. Please use the link sent to your email.", "Invalid Link");
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({
        token: token.trim(),
        new_password: data.password,
      });
      setIsSuccess(true);
      toast.success("Password updated successfully! You can now sign in.", "Password Reset Complete");
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.detail ||
        "The password reset link is invalid or has expired. Please request a new one.";
      toast.error(errorMsg, "Reset Failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <HeroBackground>
      {/* Theme Toggle in top-right */}
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
                <Sun className="w-4 h-4 text-amber-400" />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <Moon className="w-4 h-4 text-indigo-600" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12">
        <div className="mb-8">
          <SkillAlignLogo size="lg" showBadge badgeText="Security" />
        </div>

        <Card className="w-full max-w-md border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold font-outfit tracking-tight">Set New Password</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Create a strong and secure password for your SkillAlign account.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-2">
            {!token ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-left space-y-3">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Invalid or Missing Token</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  No valid reset token was found in the link. Password reset links are time-limited and single-use.
                </p>
                <div className="pt-2">
                  <Link to="/forgot-password">
                    <Button variant="default" size="sm" className="w-full text-xs font-bold">
                      Request New Reset Link
                    </Button>
                  </Link>
                </div>
              </div>
            ) : isSuccess ? (
              <div className="space-y-4 text-center animate-in fade-in duration-300">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-left space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Password Successfully Updated</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    Your password has been changed. Your previous sessions have been secured, and you can now log in with your new credentials.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="gradient"
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-md shadow-indigo-500/20"
                  onClick={() => navigate("/login")}
                >
                  Proceed to Sign In <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>New Password</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("password")}
                      className={`pl-9 pr-10 ${errors.password ? "border-rose-500" : ""}`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-rose-500 font-medium">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Confirm New Password</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("confirmPassword")}
                      className={`pl-9 pr-10 ${errors.confirmPassword ? "border-rose-500" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-rose-500 font-medium">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Password Criteria Checklist */}
                <div className="p-3 bg-secondary/30 rounded-xl border border-border/70 space-y-1.5 text-xs">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Password Requirements:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {criteria.map((c) => (
                      <div
                        key={c.label}
                        className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                          c.met ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"
                        }`}
                      >
                        {c.met ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                        )}
                        <span>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-md shadow-indigo-500/20"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Updating Password...
                    </>
                  ) : (
                    <>
                      Update Password & Sign In <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="text-center pt-3 border-t border-border/50">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </HeroBackground>
  );
};

export default ResetPasswordPage;
