/**
 * Render the first page of a PDF File to a JPEG Blob suitable for use as a
 * gallery thumbnail. pdfjs-dist is dynamically imported so the ~1MB worker
 * bundle is only paid for once the user actually uploads (or pastes) a PDF.
 */
const TARGET_WIDTH = 1024;
const JPEG_QUALITY = 0.82;
let workerConfigured = false;

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  if (!workerConfigured) {
    // Vite-friendly worker URL — bundled as a static asset.
    const workerUrl = (
      await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    ).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    workerConfigured = true;
  }
  return pdfjs;
}

export async function renderPdfFirstPageToJpeg(file: File): Promise<Blob> {
  const pdfjs = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  try {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(TARGET_WIDTH / base.width, 2.5);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // White background — PDFs draw on transparent pages by default and we
    // don't want JPEG transparency turning into black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
        'image/jpeg',
        JPEG_QUALITY,
      );
    });
    return blob;
  } finally {
    await pdf.destroy();
  }
}

/** Companion thumbnail path for a stored PDF. Mirrors the convention used
 *  by useCreatePostBundle: same bucket, same folder, with `.thumb.jpg` appended. */
export function pdfThumbPath(pdfPath: string): string {
  return `${pdfPath}.thumb.jpg`;
}

export function isPdfPath(path: string | null | undefined): boolean {
  return !!path && /\.pdf(?:[?#]|$)/i.test(path);
}
