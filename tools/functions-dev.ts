// Yerel geliştirme: supabase/functions altındaki Edge Function'ları tek Deno sürecinde çalıştırır.
// Supabase'in edge-runtime konteyneri kurumsal/vekil sertifikalı ağlarda paket indiremediğinde
// kullanılır. İstekler /functions/v1/<ad> yolundan ilgili fonksiyona gider.
//   deno run -A tools/functions-dev.ts      (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY gerekir)
const PORT = Number(Deno.env.get('FUNCTIONS_PORT') ?? 54330);
const root = new URL('../supabase/functions/', import.meta.url);
const handlers = new Map<string, (req: Request) => Response | Promise<Response>>();

// Her fonksiyonun index.ts'i Deno.serve(handler) çağırır; çağrıyı yakalayıp işleyiciyi saklıyoruz.
const realServe = Deno.serve;
let current = '';
(Deno as unknown as { serve: unknown }).serve = (a: unknown, b?: unknown) => {
  const h = (typeof a === 'function' ? a : b) as (req: Request) => Response | Promise<Response>;
  handlers.set(current, h);
  return { finished: Promise.resolve(), shutdown: async () => {}, ref() {}, unref() {}, addr: { port: PORT } };
};
for await (const e of Deno.readDir(root)) {
  if (!e.isDirectory || e.name.startsWith('_')) continue;
  current = e.name;
  await import(new URL(`${e.name}/index.ts`, root).href);
}
(Deno as unknown as { serve: unknown }).serve = realServe;

realServe({ port: PORT, hostname: '127.0.0.1', onListen: () => console.log(`functions: http://127.0.0.1:${PORT}/functions/v1/{${[...handlers.keys()].join(',')}}`) },
  (req) => {
    const m = new URL(req.url).pathname.match(/^\/functions\/v1\/([^/]+)/);
    const h = m && handlers.get(m[1]);
    return h ? h(req) : new Response(JSON.stringify({ error: 'function_not_found' }), { status: 404 });
  });
