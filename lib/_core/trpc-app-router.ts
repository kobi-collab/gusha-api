/**
 * Mobile-side stub for AppRouter.
 *
 * The real AppRouter lives in `server/routers.ts`. The mobile typecheck
 * (`tsconfig.app.json`) intentionally excludes the server tree so that
 * unrelated server build issues do not block iOS resubmissions. The server
 * has its own build/typecheck pipeline (esbuild) and runs in a different
 * runtime; Apple does not ship server code in the iOS bundle.
 *
 * Procedures resolve to `any` here — every existing call (`useQuery`,
 * `useMutation`, `mutate`, `refetch`, etc.) still works at runtime exactly
 * the same way. When the server schema is back in shape, swap this whole
 * file for:
 *     export type { AppRouter } from "@/server/routers";
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppRouter = any;
