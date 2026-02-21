/**
 * Web-only PDF text extraction using pdfjs-dist.
 * Uses browser APIs (document, canvas) - only bundled for web builds.
 */
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

export async function extractTextFromPdfWeb(uri: string): Promise<string> {
  const arrayBuffer = await fetchPdfAsArrayBuffer(uri);
  GlobalWorkerOptions.workerSrc = "";
  const loadingTask = getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const textParts: string[] = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = (textContent.items as { str?: string }[])
      .map((item) => item.str || "")
      .join("");
    textParts.push(pageText);
  }
  return textParts.join("\n");
}

async function fetchPdfAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    const response = await fetch(uri, { headers: { Accept: "*/*" } });
    if (!response.ok) throw new Error(`Failed to fetch document: ${response.status}`);
    return response.arrayBuffer();
  }
  // Blob/file URL (e.g. from DocumentPicker on web)
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Failed to read document");
  return response.arrayBuffer();
}
