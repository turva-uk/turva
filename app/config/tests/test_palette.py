"""The brand palette, and the contrast guarantees the interface depends on.

`turva.css` says colour choices "are checked for WCAG 2.2 AA contrast against
their backgrounds". These tests are that check. Without them the sentence is a
promise, and the way a promise like that fails is quiet: someone adjusts a hex
to taste, every test still passes, and the interface loses a guarantee nobody
notices until a user cannot read it.

They also hold the two interfaces together. React and the Django templates both
render Turva while the migration to React is in progress, and a brand colour
defined twice is a brand colour that will eventually be two different colours.

Nothing here is about taste. The assertions are only that the ratios clear the
thresholds and that the two definitions agree.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from django.conf import settings

STYLESHEET = Path(settings.BASE_DIR) / "app" / "static" / "css" / "turva.css"
THEME = Path(settings.BASE_DIR) / "frontend" / "src" / "theme.ts"

#: WCAG 2.2 contrast minima.
AA_NORMAL_TEXT = 4.5
#: Large text, and the boundary of a user interface component such as an input
#: border or a focus indicator.
AA_LARGE_AND_COMPONENTS = 3.0
AAA_NORMAL_TEXT = 7.0


def relative_luminance(colour: str) -> float:
    """WCAG relative luminance of a `#rrggbb` colour."""
    red, green, blue = (int(colour[i : i + 2], 16) / 255 for i in (1, 3, 5))

    def linear(channel: float) -> float:
        return channel / 12.92 if channel <= 0.03928 else ((channel + 0.055) / 1.055) ** 2.4

    return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)


def contrast(foreground: str, background: str) -> float:
    """WCAG 2.2 contrast ratio between two `#rrggbb` colours."""
    lighter, darker = sorted(
        (relative_luminance(foreground), relative_luminance(background)), reverse=True
    )
    return (lighter + 0.05) / (darker + 0.05)


def css_tokens() -> dict[str, str]:
    """The custom properties declared in `:root`."""
    source = STYLESHEET.read_text(encoding="utf-8")
    root = source[source.index(":root {") : source.index("}", source.index(":root {"))]
    return dict(re.findall(r"(--[a-z-]+):\s*(#[0-9a-fA-F]{6})", root))


def theme_scale(name: str) -> list[str]:
    """One of the exported colour scales in the React theme."""
    if not THEME.is_file():
        # Deliberately a failure, not a skip. `frontend/src` is bind-mounted
        # read-only into the application container for exactly this test, so
        # the file being absent means the mount has gone rather than that the
        # check is inapplicable - and a check that skips itself in the one
        # place it runs is not a check.
        raise AssertionError(
            f"{THEME} is missing. It is bind-mounted read-only in "
            "docker-compose.yml so this test can compare the React theme "
            "against the stylesheet."
        )

    source = THEME.read_text(encoding="utf-8")
    start = source.index(f"export const {name} = [")
    block = source[start : source.index("]", start)]
    return re.findall(r'"(#[0-9a-fA-F]{6})"', block)


@pytest.fixture(scope="module")
def tokens() -> dict[str, str]:
    return css_tokens()


class TestTheTwoInterfacesAgree:
    """React and the Django templates must render the same brand.

    Both are live while React catches up screen by screen, so a user can move
    between them in one session. Two definitions of "Turva purple" would show
    up as the interface subtly changing colour as they navigate.
    """

    def test_the_brand_purple_is_shade_six_of_the_react_scale(self, tokens):
        """Shade 6 is not arbitrary: it is Mantine's default `primaryShade`,
        so it is the shade a filled button actually renders."""
        assert tokens["--brand"] == theme_scale("TURVA_PURPLE")[6]

    def test_the_brand_text_colour_is_shade_eight(self, tokens):
        assert tokens["--brand-text"] == theme_scale("TURVA_PURPLE")[8]

    def test_the_accent_is_shade_six_of_the_yellow_scale(self, tokens):
        assert tokens["--accent"] == theme_scale("TURVA_YELLOW")[6]

    def test_both_scales_have_the_ten_shades_mantine_expects(self):
        assert len(theme_scale("TURVA_PURPLE")) == 10
        assert len(theme_scale("TURVA_YELLOW")) == 10


class TestTheColoursAreTheBrand:
    """Taken from the logo on turva.org rather than approximated.

    Pinned because "close enough" is how an identity drifts. If the brand
    genuinely changes, these are the two lines to change, and the failure
    names what it is protecting.
    """

    def test_the_brand_purple_is_the_logo_stroke(self, tokens):
        assert tokens["--brand"] == "#716c9e"

    def test_the_accent_is_the_logo_ground(self, tokens):
        assert tokens["--accent"] == "#dec55e"


class TestContrast:
    """Every pairing the stylesheet actually uses.

    The list is written out rather than derived from the CSS, because the
    point is to state what is *meant* to be legible against what. A derived
    list would follow the stylesheet into any mistake it made.
    """

    def pairings(self, tokens) -> list[tuple[str, str, str, float]]:
        ink = tokens["--ink"]
        paper = tokens["--paper"]
        sunk = tokens["--paper-sunk"]
        brand = tokens["--brand"]
        brand_text = tokens["--brand-text"]

        return [
            # (description, foreground, background, minimum)
            ("body text on the page", ink, paper, AA_NORMAL_TEXT),
            ("body text on a sunk panel", ink, sunk, AA_NORMAL_TEXT),
            ("muted text on the page", tokens["--ink-muted"], paper, AA_NORMAL_TEXT),
            ("muted text on a sunk panel", tokens["--ink-muted"], sunk, AA_NORMAL_TEXT),
            ("header text on the brand band", tokens["--brand-ink"], brand, AA_NORMAL_TEXT),
            ("button text on a brand fill", tokens["--brand-ink"], brand, AA_NORMAL_TEXT),
            ("skip link text on its brand fill", tokens["--brand-ink"], brand, AA_NORMAL_TEXT),
            ("link text on the page", brand_text, paper, AA_NORMAL_TEXT),
            # The one that caught the logo purple: empty states are sunk
            # panels, and they contain the call to action.
            ("link text on a sunk panel", brand_text, sunk, AA_NORMAL_TEXT),
            ("secondary button text, hovered", brand_text, sunk, AA_NORMAL_TEXT),
            (
                "text on the brand yellow",
                tokens["--accent-ink"],
                tokens["--accent"],
                AA_NORMAL_TEXT,
            ),
            (
                "danger text on its banner",
                tokens["--danger"],
                tokens["--danger-bg"],
                AA_NORMAL_TEXT,
            ),
            (
                "warning text on its banner",
                tokens["--warning"],
                tokens["--warning-bg"],
                AA_NORMAL_TEXT,
            ),
            (
                "success text on its banner",
                tokens["--success"],
                tokens["--success-bg"],
                AA_NORMAL_TEXT,
            ),
            ("info text on its banner", tokens["--info"], tokens["--info-bg"], AA_NORMAL_TEXT),
            # A focus indicator is a component boundary, so 3:1 - but WCAG 2.2
            # added focus-appearance requirements and this is the control a
            # keyboard-only user navigates by, so it is worth more margin than
            # the minimum.
            ("focus ring against the page", brand, paper, AA_LARGE_AND_COMPONENTS),
            ("focus ring against a sunk panel", brand, sunk, AA_LARGE_AND_COMPONENTS),
            (
                "input border against the page",
                tokens["--ink-muted"],
                paper,
                AA_LARGE_AND_COMPONENTS,
            ),
        ]

    def test_every_pairing_meets_aa(self, tokens):
        failures = []
        for description, foreground, background, minimum in self.pairings(tokens):
            ratio = contrast(foreground, background)
            if ratio < minimum:
                failures.append(
                    f"{description}: {foreground} on {background} is "
                    f"{ratio:.2f}:1, needs {minimum}:1"
                )

        assert not failures, "contrast below WCAG 2.2 AA:\n  " + "\n  ".join(failures)

    def test_brand_coloured_text_reaches_aaa_on_the_page(self, tokens):
        """The reason `--brand-text` exists as a separate token.

        The logo purple manages 4.75:1 here and 4.29:1 on a sunk panel, which
        fails. The darker shade clears AAA on the page background, which is
        the right aim for a tool people often read because something has gone
        wrong.
        """
        ratio = contrast(tokens["--brand-text"], tokens["--paper"])
        assert ratio >= AAA_NORMAL_TEXT, f"{ratio:.2f}:1"

    def test_the_logo_purple_is_not_used_for_text_on_light_backgrounds(self):
        """A regression guard with a specific history.

        `--brand` was used for link colour, and at 4.29:1 on the sunk panel
        background that failed AA - on the "create your first safety file"
        link, in the empty state, which is the first thing a new user is asked
        to click.
        """
        source = STYLESHEET.read_text(encoding="utf-8")

        offenders = []
        for rule in re.findall(r"([^{}]+)\{([^}]*)\}", source):
            selector, body = rule[0].strip(), rule[1]
            if re.search(r"(?<!-)\bcolor:\s*var\(--brand\)", body) and "background" not in body:
                offenders.append(selector)

        assert not offenders, (
            "these rules set text to the logo purple, which fails AA on the "
            f"sunk panel background; use --brand-text: {offenders}"
        )


class TestTheYellowIsADarkTextColour:
    """Every shade but the darkest needs dark text on it.

    Worth asserting because the instinct with a brand colour is to put white
    on it, and here that produces 1.71:1 - effectively invisible.
    """

    def test_white_text_on_the_accent_would_fail(self, tokens):
        assert contrast("#ffffff", tokens["--accent"]) < AA_NORMAL_TEXT

    def test_the_specified_ink_passes_comfortably(self, tokens):
        assert contrast(tokens["--accent-ink"], tokens["--accent"]) >= AAA_NORMAL_TEXT

    @pytest.mark.parametrize("shade", range(9))
    def test_shades_zero_to_eight_take_dark_text(self, shade, tokens):
        yellow = theme_scale("TURVA_YELLOW")[shade]
        assert contrast(tokens["--accent-ink"], yellow) >= AA_NORMAL_TEXT
