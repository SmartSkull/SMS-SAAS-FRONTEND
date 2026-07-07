import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const API_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
  const uploadUrl = `${API_URL.replace(/\/\/$/, '')}/uploads/${path.join('/')}`;
  const res = await fetch(uploadUrl, {
    headers: { 'ngrok-skip-browser-warning': '1' },
  });

  if (!res.ok) {
    return new NextResponse(`Upload proxy error: ${res.statusText}`, { status: res.status });
  }

  const blob = await res.blob();
  return new NextResponse(blob, {
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg' },
  });
}
