/** Type declaration for the Atkinson Hyperlegible Next variable font package. */
declare module "@fontsource-variable/atkinson-hyperlegible-next";

/**
 * Cormorant Garamond, used by the public site's display typography.
 *
 * Two entry points, not one: the package's default export carries only the
 * upright faces, and the italics live in a separate stylesheet. Importing
 * just the default renders italic text as a synthesised oblique - visually
 * close enough to miss in review, and wrong.
 */
declare module "@fontsource-variable/cormorant-garamond";
declare module "@fontsource-variable/cormorant-garamond/wght-italic.css";
