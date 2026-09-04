type PdfTextItem = {
  str: string;
  transform: number[];
  width?: number;
};

function isPdfTextItem(item: unknown): item is PdfTextItem {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<PdfTextItem>;
  return typeof candidate.str === "string" && Array.isArray(candidate.transform);
}

function groupItemsIntoLines(items: PdfTextItem[]): string[] {
  const rows: Array<{ y: number; items: Array<{ x: number; text: string }> }> = [];

  for (const item of items) {
    const text = item.str.trim();
    if (!text) continue;
    const x = Number(item.transform[4] ?? 0);
    const y = Number(item.transform[5] ?? 0);
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= 2);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push({ x, text });
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(" "))
    .filter(Boolean);
}

export async function extractEmbeddedPdfText(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
  });
  const document = await loadingTask.promise;

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.flatMap((item) => isPdfTextItem(item) ? [item as unknown as PdfTextItem] : []);
      pages.push(groupItemsIntoLines(items).join("\n"));
      page.cleanup();
    }
    return pages.join("\n\n").trim();
  } finally {
    await loadingTask.destroy();
  }
}
