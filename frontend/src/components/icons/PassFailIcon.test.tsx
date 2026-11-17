/**
 * PassIcon and FailIcon Tests
 *
 * Tests for the atomic pass/fail indicator components.
 */

import { describe, it, expect } from "vitest";
import { renderWithMantine } from "@/test/test-utils";
import PassIcon from "./PassIcon";
import FailIcon from "./FailIcon";

describe("PassIcon", () => {
  it("renders a check icon", () => {
    const { container } = renderWithMantine(<PassIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders inside a ThemeIcon container", () => {
    const { container } = renderWithMantine(<PassIcon />);
    const themeIcon = container.querySelector(".mantine-ThemeIcon-root");
    expect(themeIcon).toBeInTheDocument();
  });

  it("accepts size prop", () => {
    const { container } = renderWithMantine(<PassIcon size="lg" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});

describe("FailIcon", () => {
  it("renders an X icon", () => {
    const { container } = renderWithMantine(<FailIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders inside a ThemeIcon container", () => {
    const { container } = renderWithMantine(<FailIcon />);
    const themeIcon = container.querySelector(".mantine-ThemeIcon-root");
    expect(themeIcon).toBeInTheDocument();
  });

  it("accepts size prop", () => {
    const { container } = renderWithMantine(<FailIcon size="lg" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
