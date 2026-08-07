import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorBoundary } from "../../components/ui/ErrorBoundary";

function ThrowingChild(): React.ReactNode {
  throw new Error("Boom");
}

describe("ErrorBoundary", () => {
  it("renders the fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
