import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';
  const url = `${API_URL}/uploads/${params.path.join('/')}`;
  const res = await fetch(url, { headers: { 'ngrok-skip-browser-warning': '1' } });
  const blob = await res.blob();
  return new NextResponse(blob, {
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg' },
  });
}
