const backendUrl = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ''
).replace(/\/$/, '');

const ragApiUrl = (
  process.env.RAG_API_URL ||
  process.env.NEXT_PUBLIC_RAG_API_URL ||
  backendUrl
).replace(/\/$/, '');

type ProxyContext = {
  params: Promise<{ path: string[] }>;
};

function getForwardHeaders(request: Request) {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  return headers;
}

async function proxyRequest(request: Request, context: ProxyContext) {
  const params = await context.params;
  const isRag = params.path[0] === 'rag' || (params.path[0] === 'admin' && params.path[1] === 'rag');
  const targetBase = isRag ? ragApiUrl : backendUrl;

  if (!targetBase) {
    return Response.json(
      { success: false, message: 'Backend URL is not configured.' },
      { status: 500 }
    );
  }

  const sourceUrl = new URL(request.url);
  const targetUrl = `${targetBase}/api/${params.path.join('/')}${sourceUrl.search}`;
  const method = request.method.toUpperCase();

  const init: RequestInit = {
    method,
    headers: getForwardHeaders(request),
    redirect: 'manual',
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(targetUrl, init);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: Request, context: ProxyContext) {
  return proxyRequest(request, context);
}

export async function HEAD(request: Request, context: ProxyContext) {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: Request, context: ProxyContext) {
  return proxyRequest(request, context);
}

export async function POST(request: Request, context: ProxyContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: Request, context: ProxyContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: Request, context: ProxyContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: Request, context: ProxyContext) {
  return proxyRequest(request, context);
}
