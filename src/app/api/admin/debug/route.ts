export async function GET() {
    return Response.json({
      serviceKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "LOADED" : "MISSING"
    });
  }
  