// There's no undefined value in json. It's used to represent the pointer is refrencing an element past the last element of an array or something nonexistent.
// According to RFC6901, the latter case is an error.
export type JsonValueType =
  | { [property: string]: JsonValueType }
  | JsonValueType[]
  | number
  | boolean
  | string
  | null;

export type JsonPatchType = {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  from?: string;

  // other properties should be ignored.
  [key: string]: unknown;
}[];

export const isObject = (json: unknown): json is Record<string, unknown> =>
  typeof json === "object" &&
  json !== undefined &&
  json !== null &&
  json.constructor === Object;

export const isJsonValue = (value: unknown): value is JsonValueType => {
  if (value === undefined) return false;
  if (value === null) return true;

  // check for Array<jsonValue>
  if (Array.isArray(value)) {
    return value.reduce(
      (prev: boolean, curr) => prev && isJsonValue(curr),
      true,
    );
  }

  // check for number | boolean | string
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true;
  }

  // check for Record<string, jsonValue>
  if (typeof value !== "object") return false;
  for (const key in value) {
    if (!isJsonValue((value as Record<string, unknown>)[key])) return false;
  }
  return true;
};

export const isEqual = (a: JsonValueType, b: JsonValueType): boolean => {
  if (a === null) return b === null;

  if (Array.isArray(a)) {
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.reduce(
        (prev: boolean, curr, idx) => prev && isEqual(curr, b[idx]),
        true,
      )
    );
  }

  if (typeof a in ["number", "boolean", "string"]) return a === b;

  if (typeof a !== "object") return false; // It shouldn't happen as the type of a is jsonValue
  if (typeof b !== "object" || Array.isArray(b) || b === null) return false;

  let res = true;
  for (const key in a) {
    res = key in b && isEqual(a[key] as JsonValueType, b[key] as JsonValueType);
  }

  return res;
};
