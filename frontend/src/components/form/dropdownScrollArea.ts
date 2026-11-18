import type { ScrollAreaProps } from "@mantine/core";

/** Dropdown options scroll independently; keyboard users need a focus target. */
export function dropdownScrollArea(props?: ScrollAreaProps): ScrollAreaProps {
  return {
    ...props,
    classNames: (theme, params, ctx) => {
      const classes =
        typeof props?.classNames === "function"
          ? props.classNames(theme, params, ctx)
          : props?.classNames;
      return {
        ...classes,
        viewport: ["mantine-focus-auto", classes?.viewport, props?.viewportProps?.className]
          .filter(Boolean)
          .join(" "),
      };
    },
    viewportProps: {
      ...props?.viewportProps,
      // A focusable generic div is not a permitted listbox child; an option
      // group preserves the listbox's ownership of the nested options.
      role: props?.viewportProps?.role ?? "group",
      "aria-label": props?.viewportProps?.["aria-label"] ?? "Available options",
      tabIndex: props?.viewportProps?.tabIndex ?? 0,
    },
  };
}
