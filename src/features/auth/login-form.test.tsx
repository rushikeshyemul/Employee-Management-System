import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Providers } from "@/components/providers";
import { LoginForm } from "@/features/auth/login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
}));

describe("LoginForm", () => {
  it("shows accessible validation before calling the API", async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <LoginForm />
      </Providers>,
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your work email.")).toBeInTheDocument();
    expect(screen.getByLabelText("Show password")).toBeInTheDocument();
  });
});
