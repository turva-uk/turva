/**
 * Markdown display for documents and guidance. Marked owns parsing;
 * Turva restricts resources and sanitises the final HTML with DOMPurify.
 */
import type { ReactElement, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DOMPurify from "dompurify";
import { ActionIcon, Skeleton, Stack } from "@mantine/core";
import Icon from "@/components/icons/Icon";
import { escapeHtml, renderMarkdown } from "./markdown-renderer";
import classes from "./MarkdownView.module.css";

type Props = {
  source: string;
  asPlainText?: boolean;
  className?: string;
  onLinkClick?: (href: string) => void;
  children?: ReactNode;
  isLoading?: boolean;
  /**
   * Images are off unless a trusted caller gives an asset base. Only named
   * relative PNG/JPEG/WebP paths below it, with non-empty alt text, are drawn.
   * Markdown cannot choose a remote address or climb out of that base.
   */
  imageBase?: string;
  /**
   * Caller-approved icons for :icon-name: and :button-name: in guidance.
   * Unknown names are omitted; without this option the notation stays literal.
   */
  icons?: Readonly<Record<string, ReactElement>>;
  /** Draw pipe tables, omitting an entirely empty header row. Off by default. */
  tables?: boolean;
  /** Hide actual HTML comments, but never comment-like text inside code. */
  hideComments?: boolean;
};

const ALLOWED_TAGS = [
  "a",
  "strong",
  "em",
  "del",
  "code",
  "pre",
  "p",
  "blockquote",
  "br",
  "hr",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
];
// `start` preserves an ordered list's source numbering after sanitisation.
const ALLOWED_ATTR = ["href", "rel", "target", "start"];
const CAN_USE_DOM = typeof window !== "undefined" && typeof document !== "undefined";

function toPlainText(source: string, hideComments: boolean): string {
  if (!CAN_USE_DOM) return source;
  const html = renderMarkdown(source, { hideComments });
  const sanitised = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return new DOMParser().parseFromString(sanitised, "text/html").body.textContent || "";
}

export default function MarkdownView({
  source,
  asPlainText = false,
  className,
  onLinkClick,
  children,
  isLoading = false,
  imageBase,
  icons,
  tables = false,
  hideComments = false,
}: Props) {
  const rawHtml = useMemo(() => {
    if (asPlainText) return toPlainText(source, hideComments);
    return renderMarkdown(source, {
      imageBase,
      icons: icons === undefined ? undefined : new Set(Object.keys(icons)),
      tables,
      hideComments,
    });
  }, [source, asPlainText, imageBase, icons, tables, hideComments]);

  const sanitizedHtml = useMemo(() => {
    if (asPlainText) return rawHtml;
    // Server rendering cannot run DOMPurify: show the escaped source instead
    // of injecting unsanitised HTML or silently presenting an empty document.
    if (!CAN_USE_DOM) return escapeHtml(source);
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        ...ALLOWED_TAGS,
        ...(imageBase === undefined ? [] : ["img"]),
        ...(icons === undefined ? [] : ["span"]),
        ...(tables ? ["table", "thead", "tbody", "tr", "th", "td"] : []),
      ],
      ALLOWED_ATTR: [
        ...ALLOWED_ATTR,
        ...(imageBase === undefined ? [] : ["src", "alt", "loading"]),
        ...(icons === undefined ? [] : ["data-icon", "data-button", "aria-hidden"]),
      ],
      ALLOW_DATA_ATTR: false,
    });
  }, [rawHtml, asPlainText, imageBase, icons, tables, source]);

  // Replace a failed guide image with its alt text. `error` does not bubble,
  // so this listens in capture phase on the injected content's container.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || imageBase === undefined) return undefined;

    const showAltInstead = (image: HTMLImageElement) => {
      const box = document.createElement("span");
      box.className = classes.missingImage ?? "";
      box.textContent = image.alt;
      image.replaceWith(box);
    };
    const onError = (event: Event) => {
      if (event.target instanceof HTMLImageElement) showAltInstead(event.target);
    };

    root.addEventListener("error", onError, true);
    root.querySelectorAll("img").forEach((image) => {
      if (image.complete && image.naturalWidth === 0 && image.currentSrc) showAltInstead(image);
    });
    return () => root.removeEventListener("error", onError, true);
  }, [sanitizedHtml, imageBase, isLoading, asPlainText]);

  // Only the caller's React elements enter these generated, sanitised slots.
  const [iconSlots, setIconSlots] = useState<HTMLElement[]>([]);
  useEffect(() => {
    const root = rootRef.current;
    setIconSlots(
      root && icons ? [...root.querySelectorAll<HTMLElement>("span[data-icon]")] : [],
    );
  }, [sanitizedHtml, icons, isLoading, asPlainText]);

  if (isLoading) {
    return (
      <div className={className}>
        <Stack gap="md">
          <Skeleton height={40} width="60%" radius="md" />
          <Skeleton height={100} radius="md" />
          <Skeleton height={30} width="80%" radius="md" />
          <Skeleton height={80} radius="md" />
          <Skeleton height={30} width="70%" radius="md" />
        </Stack>
      </div>
    );
  }

  function handleClick(event: React.MouseEvent) {
    const link = event.target instanceof Element ? event.target.closest("a") : null;
    if (link && onLinkClick) {
      event.preventDefault();
      onLinkClick(link.getAttribute("href") || "");
    }
  }

  const combinedClassName = [classes.markdown, className].filter(Boolean).join(" ");
  if (asPlainText) {
    return (
      <div className={combinedClassName}>
        <pre style={{ whiteSpace: "pre-wrap" }}>{rawHtml}</pre>
        {children}
      </div>
    );
  }

  return (
    <>
      {/* Delegation also handles Enter on real anchors and clicks on bold link text. */}
      <div
        ref={rootRef}
        className={combinedClassName}
        onClick={handleClick}
        // Only the final DOMPurify allowlisted output is inserted.
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
      {iconSlots.map((slot, index) => {
        const icon = icons?.[slot.dataset.icon ?? ""];
        if (!icon) return null;
        const drawn =
          slot.dataset.button === "true" ? (
            <ActionIcon component="span" size="md" className={classes.button}>
              <Icon icon={icon} size="sm" />
            </ActionIcon>
          ) : (
            <Icon icon={icon} size="sm" />
          );
        return createPortal(drawn, slot, String(index));
      })}
      {children}
    </>
  );
}
