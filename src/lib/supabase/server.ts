import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  // Mobile clients send: Authorization: Bearer <access_token>
  // Check for this header and use it instead of cookies if present.
  let bearerToken: string | null = null;
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      bearerToken = authHeader.slice(7);
    }
  } catch {
    // headers() may throw in some contexts (e.g. static rendering) — safe to ignore
  }

  if (bearerToken) {
    // Mobile auth: inject the access token directly, no cookies needed
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    await client.auth.setSession({
      access_token: bearerToken,
      refresh_token: "",
    });
    return client;
  }

  // Web auth: cookie-based (existing behaviour unchanged)
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 中忽略此错误
          }
        },
      },
    }
  );
}
