export function extractFilesFromStream(text: string) {
  const fileRegex = /<file path="([^\"]+)">([\s\S]*?)<\/file>/g;
  const files: { path: string; content: string }[] = [];
  let match;
  while ((match = fileRegex.exec(text)) !== null) {
    files.push({ path: match[1], content: match[2] });
  }
  return files;
}