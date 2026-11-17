/**
 * Give each page its own document title (WCAG 2.4.2 Page titled).
 *
 * The title is the first thing a screen reader announces on arrival and
 * what a browser tab, history entry and bookmark show. A single-page app
 * keeps whatever `index.html` said unless something changes it, so every
 * route had the same title. The page's h1 is the natural source: this is
 * called by `PageHeader`, which is every page's one h1.
 */

import { useEffect } from "react";

/** The site's own name, after the page's in every title. */
const SITE_TITLE = "Turva";

/** Build "Page - Site", the GOV.UK pattern, most specific part first. */
export function documentTitle(pageTitle: string): string {
  return SITE_TITLE ? `${pageTitle} - ${SITE_TITLE}` : pageTitle;
}

/**
 * Set the document title while the calling component is mounted, and put
 * the previous one back when it goes. Does nothing for an empty title.
 */
export function useDocumentTitle(pageTitle: string | null | undefined): void {
  useEffect(() => {
    if (!pageTitle) return;
    const previous = document.title;
    document.title = documentTitle(pageTitle);
    return () => {
      document.title = previous;
    };
  }, [pageTitle]);
}
