const check = signal => { if (signal?.aborted) throw new DOMException("Cancelled", "AbortError"); };
export async function readDocument(file, { signal, progress = () => {}, forceOcr = false } = {}) {
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose a file no larger than 10 MB.");
  const pdfFile = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!pdfFile && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choose a PDF, PNG, JPEG or WebP image.");
  let worker; let workerPromise; let documentTask; let renderTask;
  let settled = false;
  const cancel = () => { worker?.terminate().catch(() => {}); renderTask?.cancel(); documentTask?.destroy().catch(() => {}); };
  signal?.addEventListener("abort", cancel, { once: true });
  async function recognize(canvas, page) {
    check(signal);
    if (!worker) {
      progress("Loading the text reader...");
      const { createWorker } = await import("tesseract.js"); check(signal);
      workerPromise = createWorker("eng", 1, {
        workerPath: new URL("/ocr/worker.min.js", window.location.origin).href,
        corePath: new URL("/ocr/core", window.location.origin).href,
        langPath: new URL("/ocr", window.location.origin).href,
        gzip: true,
        logger: m => { if (!signal?.aborted && !settled && m.status === "recognizing text") progress("Reading page " + page + ": " + Math.round(m.progress * 100) + "%"); },
      });
      workerPromise.then(w => { if (signal?.aborted || settled) w.terminate().catch(() => {}); }).catch(() => {});
      worker = await workerPromise; check(signal);
    }
    progress("Reading page " + page + "...");
    const result = await worker.recognize(canvas); check(signal);
    return result.data.text;
  }
  try {
    check(signal);
    if (!pdfFile) {
      progress("Opening image...");
      const bitmap = await createImageBitmap(file); check(signal);
      try {
        if (bitmap.width * bitmap.height > 40000000) throw new Error("Image is too large. Resize it below 40 megapixels.");
        const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext("2d"); ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return { text: await recognize(canvas, 1), pages: 1, usedOcr: true };
      } finally { bitmap.close(); }
    }
    progress("Opening PDF...");
    const pdfjs = await import("pdfjs-dist");
    const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl; check(signal);
    documentTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, standardFontDataUrl: "/ocr/pdf-fonts/", cMapUrl: "/ocr/pdf-cmaps/", cMapPacked: true, wasmUrl: "/ocr/pdf-wasm/" });
    const pdf = await documentTask.promise; check(signal);
    if (pdf.numPages > 12) throw new Error("Choose a PDF with 12 pages or fewer. Split larger files first.");
    const pages = []; let usedOcr = false;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      check(signal); progress("Reading PDF page " + pageNumber + " of " + pdf.numPages + "...");
      const page = await pdf.getPage(pageNumber); const content = await page.getTextContent(); check(signal);
      const rows = [];
      for (const item of content.items.filter(item => item.str?.trim()).sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])) {
        const last = rows.at(-1);
        if (last && Math.abs(last.y - item.transform[5]) < 3) last.items.push(item);
        else rows.push({ y: item.transform[5], items: [item] });
      }
      let text = rows.map(row => row.items.sort((a, b) => a.transform[4] - b.transform[4]).map(item => item.str).join(" ")).join("\n");
      if (forceOcr || text.replace(/\s/g, "").length < 60) {
        const base = page.getViewport({ scale: 1 }); const scale = Math.min(2, 2400 / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale }); const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        renderTask = page.render({ canvasContext: canvas.getContext("2d"), viewport }); await renderTask.promise; check(signal);
        text = await recognize(canvas, pageNumber); usedOcr = true; canvas.width = 1; canvas.height = 1;
      }
      pages.push(text); page.cleanup();
    }
    return { text: pages.join("\n\n"), pages: pdf.numPages, usedOcr };
  } finally {
    settled = true; signal?.removeEventListener("abort", cancel);
    if (worker) await worker.terminate().catch(() => {});
    if (documentTask) await documentTask.destroy().catch(() => {});
  }
}
