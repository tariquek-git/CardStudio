export function json(data: any, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function notFound(entity = 'Resource'): Response {
  return error(`${entity} not found`, 404);
}

export function methodNotAllowed(allowed: string[]): Response {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      'Allow': allowed.join(', '),
    },
  });
}

/** Wrap a handler with try/catch to return 500 on unexpected errors */
export function withErrorHandler(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof Response) return e; // thrown auth errors etc
      console.error('Unhandled API error:', e);
      return error('Internal server error', 500);
    }
  };
}
