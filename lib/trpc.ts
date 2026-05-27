import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

/**
 * tRPC React client for type-safe API calls.
 *
 * The AppRouter type lives in `server/routers.ts`, which is excluded from
 * the mobile typecheck (see `tsconfig.app.json` and
 * `lib/_core/trpc-app-router.ts`). Mobile callers therefore use a
 * dynamically-typed `trpc` client — runtime behaviour is unchanged.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TRPCReactClient = any;
export const trpc: TRPCReactClient = createTRPCReact();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const token = await Auth.getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        // Custom fetch to include credentials for cookie-based auth
        fetch(url: any, options: any) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
