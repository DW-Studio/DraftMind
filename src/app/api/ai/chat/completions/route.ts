// AIHubMix 代理路由 — 绕过浏览器 CORS 限制
export async function POST(request: Request) {
  const body = await request.text();
  const authHeader = request.headers.get('authorization') || '';

  const response = await fetch('https://aihubmix.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body,
  });

  // 流式转发
  if (response.body) {
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
