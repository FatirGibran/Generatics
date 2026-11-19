/**
 * Robust cross-browser clipboard utility with document.execCommand fallback
 * Ensures copying works even if navigator.clipboard is blocked by browser policies or focus loss
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // 1. Try modern navigator.clipboard API if available
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Modern API rejected (e.g. focus lost, permission policy, or non-secure origin).
      // Fall through to execCommand fallback.
    }
  }

  // 2. Synchronous fallback using temporary DOM textarea
  try {
    const el = document.createElement("textarea");
    el.value = text;
    // Prevent zoom on mobile WebKit
    el.style.fontSize = "16px";
    el.style.border = "0";
    el.style.padding = "0";
    el.style.margin = "0";
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = `${window.scrollY || 0}px`;
    el.setAttribute("aria-hidden", "true");

    document.body.appendChild(el);
    el.focus({ preventScroll: true });
    el.select();
    el.setSelectionRange(0, el.value.length);

    let successful = false;
    try {
      successful = document.execCommand("copy");
    } catch {
      successful = false;
    }

    document.body.removeChild(el);
    return successful;
  } catch {
    return false;
  }
}
