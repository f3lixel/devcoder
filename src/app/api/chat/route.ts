export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST() {
    return new Response(JSON.stringify({ error: "Deprecated. Use /api/agent/coding" }), { status: 410, headers: { "Content-Type": "application/json" } });
}
