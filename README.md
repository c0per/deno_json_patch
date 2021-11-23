# json_patch

It's a useful tool to generate and apply json patch (based on RFC6902).

For example, you can keep two json (between server and client) in sync by
sending its diff (which is smaller than the json itself) through web to keep it
fast.

## Generate patch

```typescript
import { JsonPatch } from "./src/json_patch.ts";

const jPatch = new JsonPatch();
const from = { status: "waiting" },
  to = { status: "ready", data: ["1024", true] };

const patch = jPatch.patch(from, to); // generate patch
// The patch is like the diff between "from" and "to".
// You can apply the patch to "form" to patch it to become "to".
```

## Apply patch

```typescript
import { JsonPatch } from "./src/json_patch.ts";

const jPatch = new JsonPatch();
const from = { status: "waiting" };
const patch;

const result = jPatch.patch(from, patch);
// "result" should be identical to "to".
```

## Apply pointer

json_patch comes with a tool to handle json pointer as well. You can get the
location in json specified by a JSON Pointer based on RFC6901.

```typescript
import { JsonPointer } from "./src/json_pointer.ts";

const jPointer = new JsonPointer();
const json = { arr: [12, [true, null]], str: "a string" };
const pointer = "/arr/1/0";

jPointer.apply(json, pointer) === null; // get the specified value
```

## JSON Patch

A patch is just an array of "operation". Each operation has a type of "add",
"remove", "copy", etc. An "add" operation, for example, will add some value at a
location (specified by a JSON Pointer, refer to RFC6901) in a JSON Object.

When applying a patch to a JSON Object, each operation is performed **in
sequence**.

You can refer to RFC6902 for more info.
