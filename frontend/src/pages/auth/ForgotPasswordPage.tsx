import React, { useState } from "react";
import { Link } from "react-router-dom";
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
  Mail,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  ExternalLink,
  Sun,
  Moon,
} from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email address is required").email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const toast = useToast();
  const { toggleTheme, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: data.email.trim() });
      setSubmittedEmail(data.email.trim());
      if (res.dev_reset_url) {
        setDevResetUrl(res.dev_reset_url);
      }
      toast.success(
        "If your email is registered, you will receive password reset instructions shortly.",
        "Reset Link Dispatched"
      );
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Unable to send reset email. Please try again.";
      toast.error(errorMsg, "Request Failed");
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
              <KeyRound className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold font-outfit tracking-tight">Forgot Password?</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Enter your account's email address and we'll generate a secure link to reset your password.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-2">
            {!submittedEmail ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Email Address</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      {...register("email")}
                      className={`pl-9 ${errors.email ? "border-rose-500" : ""}`}
                      autoFocus
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-rose-500 font-medium">{errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-md shadow-indigo-500/20"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending Link...
                    </>
                  ) : (
                    <>
                      Send Reset Instructions <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center animate-in fade-in duration-300">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-left space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Instructions Sent</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    We've sent a password reset link to <strong className="text-foreground font-mono">{submittedEmail}</strong>.
                    Please check your inbox (and spam folder) and follow the link to reset your password.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Link expires in 60 minutes for security reasons.
                  </p>
                </div>

                {devResetUrl && (
                  <div className="p-3.5 bg-primary/10 border border-primary/25 rounded-xl text-left space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Direct Reset Link
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Development / Sandbox link available:
                    </p>
                    <a
                      href={devResetUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs"
                    >
                      Open Reset Password Page <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubmittedEmail(null);
                    setDevResetUrl(null);
                  }}
                  className="text-xs h-9 px-4 rounded-xl border-border/80"
                >
                  Try another email
                </Button>
              </div>
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

export default ForgotPasswordPage;
