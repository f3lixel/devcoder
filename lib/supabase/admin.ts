import { createClient } from "@supabase/supabase-js"

// Server-side admin client using the service role key. Do NOT expose this in the client!
export const supabaseAdmin = () =>
	createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
		{
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				flowType: "pkce",
			},
		}
	)





