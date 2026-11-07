export async function extractDocument(file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error("Choose a file smaller than 20 MB.");
  if (/\.(txt|md|csv)$/i.test(file.name) || file.type.startsWith("text/")) return (await file.text()).slice(0, 2_000_000);
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await task.promise; const pages: string[] = [];
    try {
      if (pdf.numPages > 300) throw new Error("Please split PDFs longer than 300 pages before importing.");
      for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const content = await page.getTextContent(); pages.push(`Page ${i}\n${content.items.map(item => "str" in item ? item.str : "").join(" ")}`); if (pages.join("").length > 2_000_000) throw new Error("PDF text exceeds the 2 MB import limit. Split the document."); }
      const text = pages.join("\n\n");
      if (text.replace(/Page \d+/g, "").trim().length < 10) throw new Error("This PDF contains scanned pages. Import page images to extract text with OCR.");
      return text;
    } finally { await task.destroy(); }
  }
  if (file.type.startsWith("image/")) {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    try { const { data } = await worker.recognize(file); return data.text.slice(0, 2_000_000); } finally { await worker.terminate(); }
  }
  throw new Error("Supported files: PDF, TXT, Markdown, CSV, and images.");
}
