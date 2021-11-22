import { clone } from "../deps.ts";
import { isObject } from "./utils.ts";
import type { JsonValueType } from "./utils.ts";

export class JsonPointer {
  escapeSlash(path: string) {
    // Escape slashes in tokens according to RFC6901
    return path.replaceAll("~1", "/").replaceAll("~0", "~");
  }

  isValidPointer(path: unknown): path is string {
    // The empty path means the document itself.
    // Empty token after "/" means the index "" of current document.
    return typeof path === "string" && (path === "" || path.startsWith("/"));
  }

  isvalidArrayIndex(index: string): boolean {
    // No leading zero is allowed in array index
    return index === "0" || index === "-" || /^[1-9]\d*$/.test(index);
  }

  getTokens(path: string): string[] {
    return path.slice(1).split("/").map(this.escapeSlash);
  }

  isProperPrefix(path: string, prefix: string): boolean {
    if (!this.isValidPointer(path) || !this.isValidPointer(prefix)) {
      return false;
    }

    const pathToken = this.getTokens(path),
      prefixToken = this.getTokens(prefix);

    return (
      prefixToken.length >= pathToken.length ||
      !prefixToken.reduce(
        (prev, curr, idx) => prev && curr === pathToken[idx],
        true,
      )
    );
  }

  apply(
    json: JsonValueType,
    path: string,
    options: { deepClone: boolean } = { deepClone: false },
  ): {
    target: JsonValueType | undefined;
    parent: Record<string, JsonValueType> | JsonValueType[] | null;
    token?: string;
  } {
    if (!isObject(json)) throw new Error("JSON is required to apply path");
    if (!this.isValidPointer(path)) throw new Error("Invalid JSON Pointer");

    if (path == "") return { target: json, parent: null, token: undefined };
    const tokens = this.getTokens(path);

    let target: JsonValueType | undefined = options.deepClone
        ? clone(json)
        : json,
      parent: Record<string, JsonValueType> | JsonValueType[] | null = null;

    for (const token of tokens) {
      // Cannot read properties of nullish
      if (target === null || target === undefined) {
        throw new Error("Invalid JSON Pointer");
      }
      if (
        !(Array.isArray(target) && this.isvalidArrayIndex(token)) &&
        !isObject(target)
      ) {
        throw new Error("Invalid JSON Pointer");
      }

      parent = target;
      if (Array.isArray(target)) {
        target = token === "-" ? undefined : target[Number(token)];
      } else {
        target = target[token];
      }
    }
    return { target, parent, token: tokens.slice(-1)[0] };
  }
}
