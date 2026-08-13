/** Split text into overlapping character chunks (handbook default 600/100; we use 900/120 so column lists stay intact). */
export function chunkText(text: string, chunkSize = 900, overlap = 120): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const size = Math.max(1, Math.floor(chunkSize));
  const ov = Math.max(0, Math.min(size - 1, Math.floor(overlap)));
  const step = size - ov;
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start += step;
  }
  return chunks.filter(Boolean);
}
