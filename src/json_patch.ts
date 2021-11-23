import { clone } from "../deps.ts";
import { JsonPointer } from "./json_pointer.ts";
import { isEqual, isJsonValue, isObject } from "./utils.ts";
import type { JsonPatchType, JsonValueType } from "./utils.ts";

export class JsonPatch {
  jPointer: JsonPointer = new JsonPointer();

  #add(json: JsonValueType, path: string, value: unknown): JsonValueType {
    if (!isJsonValue(value)) throw new Error("Invalid JSON Patch");
    json = clone(json);

    if (!this.jPointer.isValidPointer(path) || !isObject(json)) {
      throw new Error("Invalid JSON Patch");
    }

    const { parent, token } = this.jPointer.apply(json, path, {
      deepClone: false,
    });

    if (Array.isArray(parent)) {
      // the target location specifies an array index
      if (token === "-") parent.push(value);
      else parent.splice(Number(token), 0, value);
    } else {
      // The entire document will be replaced
      if (parent === null) {
        json = value;
      } else {
        parent[token!] = value;
      }
    }

    return json;
  }

  #remove(json: JsonValueType, path: string): JsonValueType {
    json = clone(json);

    if (!this.jPointer.isValidPointer(path) || !isObject(json)) {
      throw new Error("Invalid JSON Patch");
    }

    const { target, parent, token } = this.jPointer.apply(json, path, {
      deepClone: false,
    });

    if (target === undefined) throw new Error("Invalid JSON Patch");

    if (Array.isArray(parent)) {
      parent.splice(Number(token), 1);
    } else {
      delete parent![token!];
    }

    return json;
  }

  #replace(json: JsonValueType, path: string, value: unknown): JsonValueType {
    if (!isJsonValue(value)) throw new Error("Invalid JSON Patch");
    json = clone(json);

    if (!this.jPointer.isValidPointer(path) || !isObject(json)) {
      throw new Error("Invalid JSON Patch");
    }

    const { target, parent, token } = this.jPointer.apply(json, path, {
      deepClone: false,
    });

    if (target === undefined || !isJsonValue(value)) {
      throw new Error("Invalid JSON Patch");
    }

    if (parent === null) {
      json = value;
    } else {
      if (Array.isArray(parent)) parent[Number(token)] = value;
      else parent[token!] = value;
    }

    return json;
  }

  #test(json: JsonValueType, path: string, value: unknown): boolean {
    if (!isJsonValue(value)) return false;

    if (!this.jPointer.isValidPointer(path) || !isObject(json)) {
      throw new Error("Invalid JSON Patch");
    }

    const { target } = this.jPointer.apply(json, path, {
      deepClone: false,
    });

    if (!isJsonValue(target) || !isJsonValue(value)) {
      throw new Error("Invalid JSON Patch");
    }

    return isEqual(target, value);
  }

  patch(
    json: JsonValueType,
    patch: JsonPatchType,
    options: { inplace: boolean } = { inplace: true },
  ): JsonValueType {
    if (!isObject(json)) throw new Error("JSON is required to apply patch");
    let patched: JsonValueType = clone(json);

    for (const operation of patch) {
      const { op, path, value, from } = operation;
      if (!op || !this.jPointer.isValidPointer(path) || !isObject(patched)) {
        throw new Error("Invalid JSON Patch");
      }

      switch (op) {
        case "add":
          patched = this.#add(patched, path, value);
          break;

        case "remove":
          patched = this.#remove(patched, path);
          break;

        case "replace":
          patched = this.#replace(patched, path, value);
          break;

        case "move":
          if (!from || !this.jPointer.isProperPrefix(path, from)) {
            throw new Error("Invalid JSON Patch");
          }

          {
            const value = this.jPointer.apply(patched, from).target;
            if (value === undefined) throw new Error("Invalid JSON Patch");

            patched = this.#remove(patched, from);
            patched = this.#add(patched, path, value);
          }
          break;

        case "copy":
          if (!from) throw new Error("Invalid JSON Patch");

          {
            const value = this.jPointer.apply(patched, from).target;
            if (value === undefined) throw new Error("Invalid JSON Patch");

            patched = this.#add(patched, path, value);
          }
          break;

        case "test":
          if (!this.#test(patched, path, value)) throw new Error("Test Failed");
          break;

        default:
          throw new Error("Invalid JSON Patch");
      }
    }

    if (options.inplace) json = patched;
    return patched;
  }

  diff(from: JsonValueType, to: JsonValueType, path = ""): JsonPatchType {
    let patch: JsonPatchType = [];

    if (to === undefined) throw new Error("Invalid JSON");

    if (Array.isArray(to)) {
      if (!Array.isArray(from)) {
        patch.push({ op: "replace", path, value: to });
      } else {
        if (from.includes(undefined!) || to.includes(undefined!)) {
          throw new Error("Invlid JSON");
        }

        const length = Math.min(from.length, to.length);
        // use "remove" operation to deal with the common prefix
        for (let i = 0; i < length; i++) {
          patch = patch.concat(this.diff(from[i], to[i], `${path}/${i}`));
        }

        if (from.length > to.length) {
          patch = patch.concat(
            Array(from.length - to.length).fill({
              op: "remove",
              path: `${path}/${to.length}`,
            }),
          );
        }
        if (to.length > from.length) {
          for (let i = from.length; i < to.length; i++) {
            patch.push({ op: "add", path: `${path}/-`, value: to[i] });
          }
        }
      }
    } else if (isObject(to)) {
      if (!isObject(from)) {
        patch.push({ op: "replace", path, value: to });
      } else {
        for (const key in to) {
          if (from[key] === undefined) {
            patch.push({
              op: "add",
              path: `${path}/${this.jPointer.escapeSlash(key)}`,
              value: to[key],
            });
          } else {
            patch = patch.concat(
              this.diff(
                from[key],
                to[key],
                `${path}/${this.jPointer.escapeSlash(key)}`,
              ),
            );
          }
        }
        for (const key in from) {
          if (key in to) continue;
          patch.push({
            op: "remove",
            path: `${path}/${this.jPointer.escapeSlash(key)}`,
          });
        }
      }
    } else if (
      to === null ||
      typeof to === "string" ||
      typeof to === "number" ||
      typeof to === "boolean"
    ) {
      if (from !== to) patch.push({ op: "replace", path, value: to });
    }
    return patch;
  }
}
