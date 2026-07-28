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
  const res = await fetch(`${DRIVE_BASE}?export=download&id=${fileId}`, { redirect: 'follow' });

  const contentType = res.headers.get('content-type') || '';

  // Step 2 — if Drive returned a virus-scan warning page, extract confirm + uuid
  if (contentType.includes('text/html')) {
    const html = await res.text();
    const confirmMatch = html.match(/name="confirm" value="([^"]+)"/);
    const uuidMatch    = html.match(/name="uuid" value="([^"]+)"/);
    if (!confirmMatch) {
      return new Response('Failed to bypass Google Drive virus scan warning.', { status: 502 });
    }

    // Step 3 — re-fetch with all the hidden fields the form would submit
    const params = new URLSearchParams({ export: 'download', id: fileId, confirm: confirmMatch[1] });
    if (uuidMatch) params.set('uuid', uuidMatch[1]);

    const finalRes = await fetch(`${DRIVE_BASE}?${params}`, { redirect: 'follow' });

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
