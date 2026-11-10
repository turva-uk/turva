import { createTheme } from "@mantine/core";

/**
 * Turva's Mantine theme, carried over from the frontend removed in October.
 *
 * The brand purple scale and the square corners are as they were. Two notes
 * for whoever touches this next:
 *
 * - `dark[1]` was `#ff0000` - pure red sitting between `#dfdfdf` and
 *   `#d0d0d0` in an otherwise greyscale ramp. That is a debugging artefact
 *   rather than a brand colour, and it would have rendered as a red surface
 *   somewhere in dark mode. Replaced with the value the ramp implies.
 * - The Django stylesheet uses `#4a2d7a` as its brand purple, which is darker
 *   than this scale's default primary shade. The two interfaces will not look
 *   identical while both exist. That is a deliberate open question rather than
 *   an oversight: picking one is a brand decision, not an engineering one.
 */
export const theme = createTheme({
  colors: {
    dark: [
      "#dfdfdf",
      "#d8d8d8",
      "#d0d0d0",
      "#aaaaaa",
      "#222222",
      "#181A1B",
      "#141414",
      "#121212",
      "#181A1B",
      "#181A1B",
    ],
    turva: [
      "#f3f2ff",
      "#e3e2f0",
      "#c5c3d9",
      "#a5a2c2",
      "#8a86ae",
      "#7974a2",
      "#716c9e",
      "#5f5a8a",
      "#54507c",
      "#474470",
    ],
  },
  primaryColor: "turva",
  components: {
    Button: {
      defaultProps: {
        radius: 0,
      },
    },
    TextInput: {
      defaultProps: {
        radius: 0,
      },
    },
    Select: {
      defaultProps: {
        radius: 0,
      },
    },
    MultiSelect: {
      defaultProps: {
        radius: 0,
      },
    },
    Textarea: {
      defaultProps: {
        radius: 0,
      },
    },
    Card: {
      defaultProps: {
        radius: 0,
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: 0,
      },
    },
  },
});
