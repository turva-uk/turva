import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithMantine } from "@/test/test-utils";
import Footer from "./Footer";

describe("Footer", () => {
  it("says what it is given, in a footer landmark", () => {
    renderWithMantine(<Footer text="Signed in as Dr Anita Patel" />);

    expect(screen.getByRole("contentinfo")).toHaveTextContent("Signed in as Dr Anita Patel");
  });

  it("renders nothing without text", () => {
    renderWithMantine(<Footer />);

    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});
