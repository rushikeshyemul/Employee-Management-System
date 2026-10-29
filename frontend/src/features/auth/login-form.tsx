"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage } from "@/lib/api/errors";
import { DEMO_PASSWORD } from "@/lib/mocks/seed";
import { loginSchema } from "@/lib/validation";

const DEMO_ACCOUNTS = [
  ["Super Admin", "super.admin@helios.example"],
  ["HR Admin", "hr.admin@helios.example"],
  ["Manager", "manager@helios.example"],
  ["Project Manager", "project.manager@helios.example"],
  ["Employee", "employee@helios.example"],
] as const;

type LoginValues = {
  email: string;
  password: string;
  remember_me: boolean;
};

export function LoginForm() {
  const auth = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember_me: false },
  });

  async function onSubmit(values: LoginValues) {
    try {
      await auth.login(values);
      const next = search.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-xs text-destructive" role="alert">{form.formState.errors.email.message}</p>
        ) : null}
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            className="pr-9"
            {...form.register("password")}
          />
          <button
            type="button"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {form.formState.errors.password ? (
          <p className="text-xs text-destructive" role="alert">{form.formState.errors.password.message}</p>
        ) : null}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.watch("remember_me")}
          onCheckedChange={(checked) => form.setValue("remember_me", checked)}
        />
        Remember this browser
      </label>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      {process.env.NODE_ENV !== "production" ? (
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-xs font-medium">Seeded accounts</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Password for every seeded account: <span className="font-mono">{DEMO_PASSWORD}</span>. Choosing an account fills the form. It does not skip sign-in.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DEMO_ACCOUNTS.map(([label, email]) => (
              <Button
                key={email}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  form.setValue("email", email);
                  form.setValue("password", DEMO_PASSWORD);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
