import type { Dataset } from "./dataset";
import type { Session } from "./session";
import { parseSession, type ParseResult } from "./session-file";

// A shared link carries the whole Session in the URL fragment, which never reaches the server.
export const LINK_KEY = "sessao";

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const piped = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function encodeSessionLink(session: Session): Promise<string> {
  const bytes = await pipe(new TextEncoder().encode(JSON.stringify(session)), new CompressionStream("deflate-raw"));
  return `${LINK_KEY}=${toBase64Url(bytes)}`;
}

export function sessionLinkPayload(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get(LINK_KEY);
}

export async function decodeSessionLink(dataset: Dataset, payload: string): Promise<ParseResult> {
  let text: string;
  try {
    text = new TextDecoder().decode(await pipe(fromBase64Url(payload), new DecompressionStream("deflate-raw")));
  } catch {
    return { ok: false, reason: "O link da Sessão está incompleto ou corrompido." };
  }
  return parseSession(dataset, text);
}
