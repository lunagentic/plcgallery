/**
 * Robust clipboard write with legacy execCommand fallback.
 *
 * The modern Clipboard API can reject in subtle situations:
 *  - non-secure contexts (rare for our app since we ship over HTTPS)
 *  - focus loss between user gesture and async write
 *  - some embedded webviews / older Safari
 *
 * On rejection we fall through to a hidden-textarea + execCommand('copy')
 * fallback so the action stays reliable.
 *
 * Returns true if either path reported success.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy
    }
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    // Position off-screen and prevent it from grabbing visual focus.
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    const prevActive = document.activeElement as HTMLElement | null;
    ta.focus({ preventScroll: true });
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    // Restore focus so React state updates triggered by the click handler
    // don't end up with stale activeElement (matters for our overlays).
    prevActive?.focus({ preventScroll: true });
    return ok;
  } catch {
    return false;
  }
}
