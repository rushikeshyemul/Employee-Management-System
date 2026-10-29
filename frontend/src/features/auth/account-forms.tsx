"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/api/errors";
import { useAuth } from "@/features/auth/auth-provider";
import { authService } from "@/lib/api/services";
import { forgotPasswordSchema, registerSchema, resetPasswordSchema } from "@/lib/validation";

export function RegisterForm() {
  const auth = useAuth();
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      confirm: "",
    },
  });

  async function onSubmit(values: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    confirm: string;
  }) {
    try {
      await auth.register({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        password: values.password,
      });
      router.replace("/dashboard");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div>
        <h1 className="text-lg font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This creates an employee account. You can clock in, request leave, and work on tasks assigned to you. Managers create and assign tasks.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" autoComplete="given-name" {...form.register("first_name")} />
          {form.formState.errors.first_name ? <p className="text-xs text-destructive">{form.formState.errors.first_name.message}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" autoComplete="family-name" {...form.register("last_name")} />
          {form.formState.errors.last_name ? <p className="text-xs text-destructive">{form.formState.errors.last_name.message}</p> : null}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email ? <p className="text-xs text-destructive">{form.formState.errors.email.message}</p> : null}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        {form.formState.errors.password ? <p className="text-xs text-destructive">{form.formState.errors.password.message}</p> : null}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" type="password" autoComplete="new-password" {...form.register("confirm")} />
        {form.formState.errors.confirm ? <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p> : null}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Creating account…" : "Create account"}
      </Button>
      <Link href="/login" className="text-sm text-primary underline-offset-4 hover:underline">Back to sign in</Link>
    </form>
  );
}

export function ForgotPasswordForm() {
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: { email: string }) {
    try {
      const result = await authService.requestPasswordReset(values);
      toast.success(result.detail);
      form.reset();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div>
        <h1 className="text-lg font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your work email. If an account exists, the server sends a reset link. This screen does not reveal whether the address is registered.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" autoComplete="username" {...form.register("email")} />
        {form.formState.errors.email ? <p className="text-xs text-destructive">{form.formState.errors.email.message}</p> : null}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>Send reset link</Button>
      <Link href="/login" className="text-sm text-primary underline-offset-4 hover:underline">Back to sign in</Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const search = useSearchParams();
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: search.get("token") ?? "", password: "", confirm: "" },
  });

  async function onSubmit(values: { token: string; password: string; confirm: string }) {
    try {
      const result = await authService.confirmPasswordReset(values);
      toast.success(result.detail);
      router.replace("/login");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div>
        <h1 className="text-lg font-semibold">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use the token from the reset email. In demo mode the token is demo-reset and it updates employee@helios.example only.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="token">Reset token</Label>
        <Input id="token" {...form.register("token")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        {form.formState.errors.password ? <p className="text-xs text-destructive">{form.formState.errors.password.message}</p> : null}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" type="password" autoComplete="new-password" {...form.register("confirm")} />
        {form.formState.errors.confirm ? <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p> : null}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>Update password</Button>
    </form>
  );
}

export function InviteScreen() {
  const params = useParams<{ token: string }>();
  return <InviteForm token={params.token} />;
}

export function InviteForm({ token }: { token: string }) {
  const router = useRouter();
  const form = useForm({
    defaultValues: { password: "", preferred_name: "" },
  });

  async function onSubmit(values: { password: string; preferred_name: string }) {
    if (values.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    try {
      const result = await authService.acceptInvite({
        token,
        password: values.password,
        preferred_name: values.preferred_name || undefined,
      });
      toast.success(result.detail);
      router.replace("/login");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <h1 className="text-lg font-semibold">Accept your invitation</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set a password to activate the account. The invitation token is checked by the server.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="preferred_name">Preferred name</Label>
        <Input id="preferred_name" {...form.register("preferred_name")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>Activate account</Button>
    </form>
  );
}
