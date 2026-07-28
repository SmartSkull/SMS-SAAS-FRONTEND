import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const DRIVE_BASE = 'https://drive.usercontent.google.com/download';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let fileId = searchParams.get('id');

  if (!fileId) {
    // Fall back to the env variable or the hardcoded default
    fileId = process.env.NEXT_PUBLIC_APK_FILE_ID ?? '1UVJwIdUYA0kF7QUAsRqCfab3383-FZIm';
  }

  // Step 1 — initial request to Google Drive
  const driveUrl = `${DRIVE_BASE}?export=download&id=${fileId}`;
  const res = await fetch(driveUrl, { redirect: 'follow' });

  const contentType = res.headers.get('content-type') || '';

  // Step 2 — if Drive returned a virus-scan warning page, extract the confirm token
  if (contentType.includes('text/html')) {
    const html = await res.text();
    const match = html.match(/confirm=([a-zA-Z0-9_-]+)/);
    if (!match) {
      return new Response('Failed to bypass Google Drive virus scan warning.', { status: 502 });
    }
    const confirmToken = match[1];

    // Step 3 — re-fetch with the confirm token to get the actual file
    const finalRes = await fetch(`${driveUrl}&confirm=${confirmToken}`, { redirect: 'follow' });

    return new Response(finalRes.body, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="Florieren-School-App.apk"',
        'Content-Length': finalRes.headers.get('content-length') || '',
      },
    });
  }

  // Already the actual binary file
  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="Florieren-School-App.apk"',
      'Content-Length': res.headers.get('content-length') || '',
    },
  });
}
