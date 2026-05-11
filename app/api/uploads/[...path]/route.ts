import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';
  const res = await fetch(`${API_URL}/uploads/${path.join('/')}`, {
    headers: { 'ngrok-skip-browser-warning': '1' },
  });
  const blob = await res.blob();
  return new NextResponse(blob, {
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg' },
  });
}
