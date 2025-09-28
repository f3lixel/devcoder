export { cn } from "./utils";
export * as layout from "./data/layout";

export type ProjectTokens = {
	projectId: string
	accessToken: string
	refreshToken: string
	expiresIn?: number | null
}

export async function saveProjectTokensPlaceholder(tokens: ProjectTokens) {
	// Placeholder: Replace with your own implementation using Supabase tables or any DB
	console.log("saveProjectTokensPlaceholder", tokens.projectId)
}



