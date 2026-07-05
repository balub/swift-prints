export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadDxf(content: string, filename: string) {
  downloadTextFile(content, filename, "application/dxf");
}

export function downloadSvg(content: string, filename: string) {
  downloadTextFile(content, filename, "image/svg+xml");
}
