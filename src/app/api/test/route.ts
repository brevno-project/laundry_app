import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'working',
    message: 'API routes are working!',
    timestamp: new Date().toISOString(),
  });
}
