export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  });
}
