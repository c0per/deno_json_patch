import {
  assertExists,
  assertObjectMatch,
} from "https://deno.land/std@0.115.1/testing/asserts.ts";
import { JsonPatch } from "../mod.ts";

Deno.test("test patch for corner cases", async (t) => {
  const jPatch = new JsonPatch();

  await t.step("patch to an empty json", () => {
    const from = {},
      to = {};
    const patch = jPatch.diff(from, to);
    const result = jPatch.patch(from, patch);

    assertExists(result);
    assertObjectMatch(to, result as Record<string, unknown>);
  });
});

Deno.test("test patch with array", async (t) => {
  const jPatch = new JsonPatch();

  await t.step("add array", () => {
    const from = { toDel: [12, "qwq"] },
      to = { arr: [12, "qwq", null, true, "13", false] };
    const patch = jPatch.diff(from, to);
    const result = jPatch.patch(from, patch);

    assertExists(result);
    assertObjectMatch(to, result as Record<string, unknown>);
  });

  await t.step("modify array", () => {
    const from = { toDel: [12, "qwq"], arr: ["qwq", 12] },
      to = { arr: [12, "qwq", null, true, "13", false] };
    const patch = jPatch.diff(from, to);
    const result = jPatch.patch(from, patch);

    assertExists(result);
    assertObjectMatch(to, result as Record<string, unknown>);
  });

  await t.step("nested array", () => {
    const from = {
        toDel: [12, "qwq"],
        arr: ["qwq", 12],
        arr2: [[12, 23], [], null, {}],
      },
      to = {
        arr: [12, "qwq", null, true, "13", false],
        arr2: [[12, [23], 13], null, null, {}],
      };
    const patch = jPatch.diff(from, to);
    const result = jPatch.patch(from, patch);

    assertExists(result);
    assertObjectMatch(to, result as Record<string, unknown>);
  });
});

Deno.test("test patch with object", async (t) => {
  const jPatch = new JsonPatch();

  await t.step("patch to an empty object", () => {
    const from = { obj: { a: 12, b: null } },
      to = { obj: {} };
    const patch = jPatch.diff(from, to);
    const result = jPatch.patch(from, patch);

    assertExists(result);
    assertObjectMatch(to, result as Record<string, unknown>);
  });

  await t.step("object with array", () => {
    const from = { status: "waiting" },
      to = { status: "ready", data: ["1024", true] };

    const patch = jPatch.diff(from, to);
    const result = jPatch.patch(from, patch);

    assertExists(result);
    assertObjectMatch(to, result as Record<string, unknown>);
  });

  await t.step("patch to nested object", () => {
    const from = { obj: { a: 12, b: null }, target: {} },
      to = { obj: {}, target: { nested: { arr: [12, 13] } } };
    const patch = jPatch.diff(from, to);
    const result = jPatch.patch(from, patch);

    assertExists(result);
    assertObjectMatch(to, result as Record<string, unknown>);
  });
});
