import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Join } from "../../pages/Join";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("../../lib/supabaseClient", () => ({ supabase: { from } }));

describe("Join", () => {
  it("shows the temporary verification message without querying invitation rows", () => {
    window.history.replaceState({}, "", "/join?token=secret-token");
    render(<Join />);
    expect(screen.getByText(/invitation verification is temporarily unavailable/i)).toBeInTheDocument();
    expect(from).not.toHaveBeenCalled();
  });
});
