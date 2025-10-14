/**
 * Runtime compatibility layer for Bun-specific APIs
 * Provides Node.js fallbacks when running in non-Bun environments
 */

import { readFile, writeFile, stat } from "fs/promises";
import { createReadStream } from "fs";
import { promisify } from "util";
import { gzip, gunzip } from "zlib";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// Check if running in Bun runtime
const isBun = typeof Bun !== "undefined";

// Regex-based ANSI stripper for Node.js fallback
const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/**
 * Runtime adapter exposing unified API for Bun and Node.js
 */
export const runtime = {
  isBun,

  /**
   * File reading API
   */
  file(path: string) {
    if (isBun) {
      return Bun.file(path);
    }

    // Node.js fallback
    return {
      text: async () => readFile(path, "utf-8"),
      json: async () => JSON.parse(await readFile(path, "utf-8")),
      arrayBuffer: async () => {
        const buffer = await readFile(path);
        return buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        );
      },
      stream: () => createReadStream(path),
      exists: async () => {
        try {
          await stat(path);
          return true;
        } catch {
          return false;
        }
      },
      size: async () => {
        const stats = await stat(path);
        return stats.size;
      },
      stat: async () => stat(path),
    };
  },

  /**
   * File writing API
   */
  async write(path: string, data: string | Buffer | Uint8Array | object) {
    if (isBun) {
      return Bun.write(path, typeof data === "object" && !Buffer.isBuffer(data) && !(data instanceof Uint8Array) ? JSON.stringify(data) : data);
    }

    // Node.js fallback
    const content = typeof data === "object" && !Buffer.isBuffer(data) && !(data instanceof Uint8Array)
      ? JSON.stringify(data)
      : data;
    return writeFile(path, content as any);
  },

  /**
   * Compression API - uses zstd in Bun, gzip in Node
   */
  async compress(data: string | Buffer | Uint8Array): Promise<Uint8Array> {
    const buffer = typeof data === "string" ? Buffer.from(data) : data;
    
    if (isBun && typeof Bun.zstdCompress === "function") {
      return Bun.zstdCompress(buffer);
    }

    // Node.js fallback: use gzip
    const compressed = await gzipAsync(buffer);
    return new Uint8Array(compressed);
  },

  /**
   * Decompression API - uses zstd in Bun, gunzip in Node
   */
  async decompress(data: Buffer | Uint8Array): Promise<Uint8Array> {
    if (isBun && typeof Bun.zstdDecompress === "function") {
      return Bun.zstdDecompress(data);
    }

    // Node.js fallback: use gunzip
    const decompressed = await gunzipAsync(data);
    return new Uint8Array(decompressed);
  },

  /**
   * Strip ANSI escape codes - uses Bun.stripANSI if available
   */
  stripAnsi(str: string): string {
    if (isBun && typeof Bun.stripANSI === "function") {
      return Bun.stripANSI(str);
    }

    // Node.js fallback: regex-based
    return str.replace(ansiRegex, "");
  },

  /**
   * Secrets management - uses Bun.secrets if available
   */
  secrets: {
    async get(opts: { service: string; name: string }): Promise<string | null> {
      if (isBun && typeof Bun.secrets?.get === "function") {
        return Bun.secrets.get(opts);
      }
      // Node.js fallback: environment variables only
      return process.env[opts.name] || null;
    },

    async set(opts: { service: string; name: string; value: string }): Promise<void> {
      if (isBun && typeof Bun.secrets?.set === "function") {
        return Bun.secrets.set(opts);
      }
      // Node.js fallback: no-op (can't persist securely)
      console.warn(`[runtime] Bun.secrets not available. Secret "${opts.name}" not persisted.`);
    },
  },

  /**
   * Garbage collection API
   */
  gc() {
    if (isBun && typeof Bun.gc === "function") {
      Bun.gc();
      return;
    }

    // Node.js fallback
    if (global.gc) {
      global.gc();
    }
  },

  /**
   * Environment variables
   */
  env: new Proxy({} as Record<string, string | undefined>, {
    get: (_target, prop: string) => {
      if (isBun && typeof Bun?.env !== "undefined") {
        return (Bun.env as any)[prop];
      }
      return process.env[prop];
    },
  }),

  /**
   * Sleep/delay API
   */
  async sleep(ms: number) {
    if (isBun && typeof Bun.sleep === "function") {
      return Bun.sleep(ms);
    }

    // Node.js fallback
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Hash API for cache keys (fast non-crypto hash)
   */
  hash(data: string | Uint8Array): string {
    if (isBun && typeof Bun.hash?.rapidhash === "function") {
      return String(Bun.hash.rapidhash(data));
    }

    // Node.js fallback: simple hash
    const str = typeof data === "string" ? data : new TextDecoder().decode(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return String(hash);
  },
};

// Legacy exports for backwards compatibility
export const file = runtime.file;
export const write = runtime.write;
export const gc = runtime.gc;
export const env = runtime.env;
export const sleep = runtime.sleep;

export default runtime;
