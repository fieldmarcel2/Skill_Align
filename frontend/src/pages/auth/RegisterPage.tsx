import React, { useState } from "react";
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
import { HeroBackground } from "../../components/effects/HeroBackground";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
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

export const RegisterPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      // 1. Register candidate
      await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      // 2. Auto login
      const loginRes = await authApi.login({
        email: data.email,
        password: data.password,
      });

      await login(loginRes.access_token);
      toast.success("Account created successfully! Welcome to SkillAlign.", "Registered");
      navigate("/candidate");
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Registration failed. Please try again.";
      toast.error(errorMsg, "Registration Error");
    } finally {
      setIsLoading(false);
    }
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
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">Candidate Registration</CardTitle>
            <CardDescription>
              Create your candidate account to start matching with open roles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Full Name</label>
                <Input
                  type="text"
                  placeholder="e.g. John Doe"
                  {...register("name")}
                  className={errors.name ? "border-rose-500" : ""}
                />
                {errors.name && <p className="text-xs text-rose-600 font-medium">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Email Address</label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  {...register("email")}
                  className={errors.email ? "border-rose-500" : ""}
                />
                {errors.email && <p className="text-xs text-rose-600 font-medium">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Password</label>
                <Input
                  type="password"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  {...register("password")}
                  className={errors.password ? "border-rose-500" : ""}
                />
                {errors.password && (
                  <p className="text-xs text-rose-600 font-medium">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  {...register("confirmPassword")}
                  className={errors.confirmPassword ? "border-rose-500" : ""}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-rose-600 font-medium">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="gradient"
                className="w-full h-11 text-base font-semibold mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating Account...
                  </>
                ) : (
                  "Create Candidate Account"
                )}
              </Button>
            </form>

            <div className="text-center text-xs text-muted-foreground pt-2">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </HeroBackground>
  );
};
