---
name: convex-best-practices
description: >
  Convex backend best practices for functions, queries, mutations, actions, schemas,
  validators, and file storage. Use when building Convex backends, writing Convex
  functions, queries, mutations, actions, HTTP endpoints, crons, or when the user
  mentions Convex, convex functions, or convex database.
---

# Convex Best Practices

Follow these guidelines when building Convex backends, writing functions, queries, mutations, actions, schemas, and validators.

## Function Syntax

**Always use the new function syntax:**

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
export const f = query({
  args: {},
  handler: async (ctx, args) => {
    // Function body
  },
});
```

**HTTP endpoints** live in `convex/http.ts` with `httpAction`:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
const http = httpRouter();
http.route({
  path: "/echo",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.bytes();
    return new Response(body, { status: 200 });
  }),
});
```

## Function Registration

| Type | Use For | Import From |
|------|---------|-------------|
| `query`, `mutation`, `action` | Public API (exposed to client) | `./_generated/server` |
| `internalQuery`, `internalMutation`, `internalAction` | Private, internal-only | `./_generated/server` |

- **Always include argument validators** for all functions.
- **Never** use `query`/`mutation`/`action` for sensitive internal logic—use `internal*` variants.
- Functions without a return value implicitly return `null`.
- **Use `null` instead of `undefined`**: `undefined` is not a valid Convex value; functions returning nothing yield `null` to clients.

## Function Calling

| Call From | Use To Call | Method |
|-----------|-------------|--------|
| Query | Query | `ctx.runQuery` |
| Mutation/Action | Mutation | `ctx.runMutation` |
| Action | Action | `ctx.runAction` |

- Only call **action from action** when crossing runtimes (e.g. V8 to Node). Otherwise, extract shared logic into a helper async function.
- Minimize action→query/mutation calls; splitting logic risks race conditions.
- Use `FunctionReference` from `api` or `internal`—never pass the function directly.
- For same-file calls, add a type annotation on the return value to work around TypeScript circularity.

## Function References

- `api` (from `./_generated/api`) → public functions: `api.example.f`
- `internal` (from `./_generated/api`) → internal functions: `internal.example.g`
- File-based routing: `convex/messages/access.ts` → `api.messages.access.h`

## Validators

- Use `v.int64()` instead of deprecated `v.bigint()`.
- Use `v.record()` for records; `v.map()` and `v.set()` are not supported.

**Convex types:**

| Type | Validator | Notes |
|------|-----------|-------|
| Id | `v.id(tableName)` | |
| Null | `v.null()` | Use `null`, not `undefined` |
| Int64 | `v.int64()` | BigInt |
| Float64 | `v.number()` | |
| Boolean | `v.boolean()` | |
| String | `v.string()` | UTF-8, &lt;1MB |
| Bytes | `v.bytes()` | ArrayBuffer, &lt;1MB |
| Array | `v.array(v)` | Max 8192 values |
| Object | `v.object({})` | Max 1024 entries, no `$` or `_` prefix on keys |
| Record | `v.record(keys, values)` | Dynamic keys, ASCII only |

**Discriminated union example:**

```typescript
v.union(
  v.object({ kind: v.literal("error"), errorMessage: v.string() }),
  v.object({ kind: v.literal("success"), value: v.number() })
)
```

## Schema

- Define schema in `convex/schema.ts`.
- Import from `convex/server`.
- System fields: `_id`, `_creationTime` (auto-added).
- Index names must include all index fields: `["field1", "field2"]` → `"by_field1_and_field2"`.
- Index fields must be queried in definition order; create separate indexes for different orderings.

## TypeScript

- Use `Id<'tableName'>` from `./_generated/dataModel` for document IDs.
- For `v.record(v.id('users'), v.string())` → type `Record<Id<'users'>, string>`.
- Use `as const` for string literals in discriminated unions.
- Define arrays as `const arr: Array<T> = [...]` and records as `const rec: Record<K, V> = {...}`.

## Queries

- **Do not use `filter`**—define indexes and use `withIndex` instead.
- Convex queries do **not** support `.delete()`. Use `.collect()`, iterate, and call `ctx.db.delete(row._id)`.
- Use `.unique()` for a single document (throws if multiple match).
- Prefer `for await (const row of query)` over `.collect()` or `.take(n)` when using async iteration.
- Ordering: default ascending `_creationTime`; use `.order('asc')` or `.order('desc')`.

## Mutations

- `ctx.db.replace(table, id, doc)` — full replace; throws if doc doesn't exist.
- `ctx.db.patch(table, id, partial)` — shallow merge; throws if doc doesn't exist.

## Actions

- Add `"use node";` at top of files that use Node.js built-ins.
- **Never** add `"use node";` to files that also export queries or mutations.
- `fetch()` is available in the default runtime—no `"use node";` needed for it.
- **Never use `ctx.db`** inside actions; actions have no database access.

## Pagination

```typescript
import { paginationOptsValidator } from "convex/server";
export const list = query({
  args: { paginationOpts: paginationOptsValidator, author: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_author", (q) => q.eq("author", args.author))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

`paginationOpts`: `{ numItems: v.number(), cursor: v.union(v.string(), v.null()) }`  
Return: `{ page, isDone, continueCursor }`.

## Crons

- Use `crons.interval` or `crons.cron` only—not `crons.hourly`, `crons.daily`, `crons.weekly`.
- Pass `FunctionReference`, not the function directly.
- Export crons as default:

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval("delete inactive users", { hours: 2 }, internal.crons.empty, {});
export default crons;
```

## File Storage

- Use `ctx.storage.getUrl()` for signed URLs.

- **Do not use** deprecated `ctx.storage.getMetadata`. Query `_storage` system table instead:

```typescript
const metadata = await ctx.db.system.get("_storage", fileId);
```

- Storage items are `Blob` objects; convert to/from `Blob` when using Convex storage.

## Full-Text Search

```typescript
const messages = await ctx.db
  .query("messages")
  .withSearchIndex("search_body", (q) =>
    q.search("body", "hello hi").eq("channel", "#general")
  )
  .take(10);
```

## Additional Resources

- For full examples and validator reference, see [reference.md](reference.md).
