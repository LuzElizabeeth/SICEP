async function state(request, db) {
  // This standalone worker owns its single exercise table.
  await db.prepare("CREATE TABLE IF NOT EXISTS exercise (id INTEGER PRIMARY KEY, stage INTEGER NOT NULL, count INTEGER NOT NULL, updated TEXT NOT NULL, assigned TEXT, received TEXT)").run();
  await db.prepare("INSERT OR IGNORE INTO exercise (id,stage,count,updated) VALUES (1,1,35,'2026-11-24T15:00:00Z')").run();
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== new URL(request.url).origin) return new Response(null,{status:403});
    const {stage,count,revision} = await request.json();
    if (![0,1,2,3].includes(stage) || !Number.isInteger(count) || count<1 || count>9999 || typeof revision !== 'string') return new Response(null,{status:400});
    const now = new Date().toISOString();
    const result = await db.prepare(`UPDATE exercise SET stage=?, count=CASE WHEN ?=1 THEN ? ELSE count END, updated=?, assigned=CASE WHEN ?=2 THEN ? WHEN ?<2 THEN NULL ELSE assigned END, received=CASE WHEN ?=3 THEN ? ELSE NULL END WHERE id=1 AND updated=? AND (?=0 OR (?=stage+1 AND (?!=2 OR count<=40)))`).bind(stage,stage,count,now,stage,now,stage,stage,now,revision,stage,stage,stage).run();
    if (!result.meta.changes) return new Response(null,{status:409});
  } else if(request.method !== 'GET') return new Response(null,{status:405});
  return Response.json(await db.prepare("SELECT stage,count,updated,assigned,received FROM exercise WHERE id=1").first(),{headers:{'Cache-Control':'no-store'}});
}
