/**
 * Runtime compatibility layer for Bun-specific APIs
 * Provides Node.js fallbacks when running in non-Bun environments
 */

import { readFile, writeFile, stat } from "fs/promises";

// Check if running in Bun runtime
const isBun = typeof Bun !== "undefined";

// Polyfill Bun global if not available
if (!isBun) {
  (globalThis as any).Bun = {
    file: (path: string) => ({
      text: async () => readFile(path, "utf-8"),
      json: async () => JSON.parse(await readFile(path, "utf-8")),
      arrayBuffer: async () => {
        const buffer = await readFile(path);
        return buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        );
      },
      stream: () => {
        const fs = require("fs");
        return fs.createReadStream(path);
      },
      exists: async () => {
        try {
          await stat(path);
          return true;
        } catch {
          return false;
        }
      },
      stat: () => stat(path),
    }),
    write: async (path: string, data: string | Buffer | object) => {
      const content = typeof data === "object" && !Buffer.isBuffer(data) 
        ? JSON.stringify(data)
        : data;
      return writeFile(path, content as any, "utf-8");
    },
    gc: () => {
      if (global.gc) {
        global.gc();
      }
    },
    env: new Proxy(
      {},
      {
        get: (_target, prop: string) => process.env[prop],
      }
    ),
    sleep: async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

/**
 * File API compatibility
 */
export const file = (path: string) => {
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
    stream: () => {
      const fs = require("fs");
      return fs.createReadStream(path);
    },
    exists: async () => {
      try {
        await stat(path);
        return true;
      } catch {
        return false;
      }
    },
    stat: () => stat(path),
  };
};

/**
 * Write file compatibility
 */
export const write = async (path: string, data: string | Buffer | object) => {
  if (isBun) {
    return Bun.write(path, typeof data === "object" && !Buffer.isBuffer(data) ? JSON.stringify(data) : data);
  }

  // Node.js fallback
  const content = typeof data === "object" && !Buffer.isBuffer(data) 
    ? JSON.stringify(data)
    : data;
  return writeFile(path, content, "utf-8");
};

/**
 * Garbage collection compatibility
 */
export const gc = () => {
  if (isBun) {
    Bun.gc();
    return;
  }

  // Node.js fallback
  if (global.gc) {
    global.gc();
  }
  // Silent no-op if gc not exposed
};

/**
 * Environment variable compatibility
 */
export const env: Record<string, string | undefined> = new Proxy(
  {},
  {
    get: (_target, prop: string) => {
      if (isBun && typeof Bun !== "undefined") {
        return (Bun.env as any)[prop];
      }
      return process.env[prop];
    },
  }
);

/**
 * Sleep compatibility
 */
export const sleep = async (ms: number) => {
  if (isBun) {
    return Bun.sleep(ms);
  }

  // Node.js fallback
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export default {
  file,
  write,
  gc,
  env,
  sleep,
};
