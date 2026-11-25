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

async function routeReports(request,db){
  await db.prepare("CREATE TABLE IF NOT EXISTS route_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, town INTEGER NOT NULL, street TEXT NOT NULL, hazard TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'medium', impact TEXT NOT NULL DEFAULT 'blocked', note TEXT NOT NULL DEFAULT '', photo TEXT, created TEXT NOT NULL)").run();
  const columns=await db.prepare("PRAGMA table_info(route_reports)").all(),names=(columns.results||[]).map(column=>column.name);
  if(!names.includes('severity'))await db.prepare("ALTER TABLE route_reports ADD COLUMN severity TEXT NOT NULL DEFAULT 'medium'").run();
  if(!names.includes('impact'))await db.prepare("ALTER TABLE route_reports ADD COLUMN impact TEXT NOT NULL DEFAULT 'blocked'").run();
  if(request.method==='POST'){
    if(request.headers.get('Origin')!==new URL(request.url).origin)return new Response(null,{status:403});
    let body;try{body=await request.json()}catch{return Response.json({error:'JSON inválido'},{status:400})}
    const prefixes={0:'cholula',1:'atempan'};
    const hazards=['derrumbe','socavon','inundacion','obstruccion','otro'];
    const {town,street,hazard,severity='medium',impact='blocked',note='',photo=null}=body||{};
    const segmentPattern=typeof street==='string'&&new RegExp('^'+prefixes[town]+'-(h-[0-3]-[0-2]|v-[0-2]-[0-3])$').test(street);
    if(!Number.isInteger(town)||!prefixes[town]||!segmentPattern||!hazards.includes(hazard)||!['low','medium','high'].includes(severity)||!['blocked','partial','passable'].includes(impact)||typeof note!=='string'||note.length>350)return Response.json({error:'Reporte inválido'},{status:400});
    if(photo!==null&&(typeof photo!=='string'||photo.length>210000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)))return Response.json({error:'Foto inválida o demasiado grande'},{status:413});
    const created=new Date().toISOString();
    await db.prepare("INSERT INTO route_reports (town,street,hazard,severity,impact,note,photo,created) VALUES (?,?,?,?,?,?,?,?)").bind(town,street,hazard,severity,impact,note.trim(),photo,created).run();
  }else if(request.method!=='GET')return new Response(null,{status:405});
  const reports=await db.prepare("SELECT id,town,street,hazard,severity,impact,note,created,CASE WHEN photo IS NULL THEN 0 ELSE 1 END AS hasPhoto FROM route_reports ORDER BY id DESC LIMIT 50").all();
  const blocked=await db.prepare("SELECT DISTINCT CAST(town AS TEXT)||':'||street AS key FROM route_reports WHERE impact='blocked'").all();
  return Response.json({reports:reports.results||[],blocked:(blocked.results||[]).map(r=>r.key)},{headers:{'Cache-Control':'no-store'}});
}
async function routePhoto(request,db,id){
  if(request.method!=='GET'||!/^[0-9]+$/.test(id))return new Response(null,{status:404});
  const row=await db.prepare("SELECT photo FROM route_reports WHERE id=?").bind(Number(id)).first();
  if(!row?.photo)return new Response(null,{status:404});
  const encoded=row.photo.slice('data:image/jpeg;base64,'.length);
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  return new Response(bytes,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}});
}
