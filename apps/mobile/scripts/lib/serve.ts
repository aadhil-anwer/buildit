import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";

const MIME: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

/** Serves a folder on a free local port, for the design prototype. */
export function serve(dir: string) {
  const server = createServer((req, res) => {
    const file = join(dir, normalize(decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname)));
    if (!file.startsWith(dir) || !existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  return new Promise<{ url: string; stop: () => void }>((done) =>
    server.listen(0, "127.0.0.1", () => done({ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, stop: () => server.close() })),
  );
}
