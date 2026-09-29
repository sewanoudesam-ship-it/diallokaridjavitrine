type EdgeHandler = (request: Request) => Response | Promise<Response>;
type EdgeRuntime = {
  env: { get(name: string): string | undefined };
  serve(handler: EdgeHandler): void;
};

function getEdgeRuntime(): EdgeRuntime | undefined {
  return (globalThis as unknown as { Deno?: EdgeRuntime }).Deno;
}

export function runtimeEnv(name: string): string | undefined {
  return getEdgeRuntime()?.env.get(name);
}

export function serveEdge(handler: EdgeHandler): void {
  const runtime = getEdgeRuntime();
  if (!runtime) throw new Error("EDGE_RUNTIME_REQUIRED");
  runtime.serve(handler);
}
