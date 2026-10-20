import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function extractGoogleDriveFileId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const str = urlOrId.trim();
  const fileMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  const idMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  if (/^[a-zA-Z0-9_-]{25,}$/.test(str)) {
    return str;
  }

  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idOrUrl = searchParams.get('id') || searchParams.get('url');

  if (!idOrUrl) {
    return NextResponse.json({ error: 'Parameter id atau url diperlukan' }, { status: 400 });
  }

  const fileId = extractGoogleDriveFileId(idOrUrl);
  if (!fileId) {
    return NextResponse.json({ error: 'ID Google Drive tidak valid' }, { status: 400 });
  }

  try {
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    let response = await fetch(downloadUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gagal mengunduh file dari Google Drive (Status: ${response.status})` },
        { status: response.status }
      );
    }

    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || '';

    // Check if Google Drive returned a virus scan warning confirmation page
    if (contentType.includes('text/html')) {
      const htmlText = await response.text();
      const confirmMatch = htmlText.match(/confirm=([0-9a-zA-Z_]+)/);
      if (confirmMatch) {
        const confirmToken = confirmMatch[1];
        const confirmedUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
        response = await fetch(confirmedUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        contentType = response.headers.get('content-type') || 'application/octet-stream';
      }
    }

    let filename = '';
    const fnMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    if (fnMatch) {
      filename = decodeURIComponent(fnMatch[1].trim());
    }

    const buffer = await response.arrayBuffer();

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    if (filename) {
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      headers.set('X-File-Name', encodeURIComponent(filename));
    }
    // Allow browser access to custom header
    headers.set('Access-Control-Expose-Headers', 'X-File-Name, Content-Disposition');
    headers.set('Cache-Control', 'public, max-age=3600');

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('[download-proxy] Error:', err);
    return NextResponse.json({ error: err.message || 'Gagal mengunduh file' }, { status: 500 });
  }
}
