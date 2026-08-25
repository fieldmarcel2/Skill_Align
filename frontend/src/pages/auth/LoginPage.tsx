import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
import { Sparkles, Loader2, Shield, Users, Briefcase, UserCheck } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      const user = await login(res.access_token);
      toast.success(`Welcome back, ${user.name}!`, "Signed In");

      // Redirect based on role
      switch (user.role.name) {
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
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Invalid email or password.";
      toast.error(errorMsg, "Sign In Failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (email: string, pass: string) => {
    setValue("email", email);
    setValue("password", pass);
    onSubmit({ email, password: pass });
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
            <CardTitle className="text-2xl font-bold">Sign In to Your Account</CardTitle>
            <CardDescription>
              Enter your credentials or select a 1-click test role account below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Email Address</label>
                <Input
                  type="email"
                  placeholder="name@company.com"
                  {...register("email")}
                  className={errors.email ? "border-rose-500" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-rose-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Password</label>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={errors.password ? "border-rose-500" : ""}
                />
                {errors.password && (
                  <p className="text-xs text-rose-400">{errors.password.message}</p>
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
                  "Sign In"
                )}
              </Button>
            </form>

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
