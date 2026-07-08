import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const startTime = performance.now();
    
    // We attempt a fetch request.
    // Try HEAD request first because it retrieves headers without content (highly efficient).
    // Timeout in 3.5 seconds.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    let response: Response | null = null;
    let success = false;

    try {
      response = await fetch(targetUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'User-Agent': 'Developer-Hub-Monitor/1.0' },
        cache: 'no-store'
      });
      success = response.status >= 200 && response.status < 400;
    } catch {
      // Fallback to GET in case server blocks HEAD or doesn't support it
      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 3500);
      try {
        response = await fetch(targetUrl, {
          method: 'GET',
          signal: fallbackController.signal,
          headers: { 'User-Agent': 'Developer-Hub-Monitor/1.0' },
          cache: 'no-store'
        });
        success = response.status >= 200 && response.status < 400;
      } catch {
        success = false;
      } finally {
        clearTimeout(fallbackTimeoutId);
      }
    } finally {
      clearTimeout(timeoutId);
    }

    const latency = Math.round(performance.now() - startTime);

    if (success) {
      return NextResponse.json({ status: 'online', latency });
    } else {
      return NextResponse.json({ 
        status: 'offline', 
        latency: 0, 
        code: response ? response.status : 'CONN_REFUSED' 
      });
    }
  } catch {
    return NextResponse.json({ status: 'offline', latency: 0 });
  }
}
export const dynamic = 'force-dynamic';
