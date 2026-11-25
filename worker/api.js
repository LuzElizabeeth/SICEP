async function state(request, db) {
  // This standalone worker owns its single exercise table.
  await db.prepare("CREATE TABLE IF NOT EXISTS exercise (id INTEGER PRIMARY KEY, stage INTEGER NOT NULL, count INTEGER NOT NULL, updated TEXT NOT NULL, assigned TEXT, received TEXT, details TEXT NOT NULL DEFAULT '{}', history TEXT NOT NULL DEFAULT '[]')").run();
  const columns=await db.prepare("PRAGMA table_info(exercise)").all(),names=(columns.results||[]).map(column=>column.name);
  if(!names.includes('details'))await db.prepare("ALTER TABLE exercise ADD COLUMN details TEXT NOT NULL DEFAULT '{}'").run();
  if(!names.includes('history'))await db.prepare("ALTER TABLE exercise ADD COLUMN history TEXT NOT NULL DEFAULT '[]'").run();
  await db.prepare("INSERT OR IGNORE INTO exercise (id,stage,count,updated) VALUES (1,1,35,'2026-11-24T15:00:00Z')").run();
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== new URL(request.url).origin) return new Response(null,{status:403});
    let body;try{body=await request.json()}catch{return Response.json({error:'JSON inválido'},{status:400})}
    const {stage,count,revision}=body||{};
    if (![0,1,2,3].includes(stage) || !Number.isInteger(count) || count<1 || count>9999 || typeof revision !== 'string') return new Response(null,{status:400});
    const current=await db.prepare("SELECT stage,count,updated,assigned,received,details,history FROM exercise WHERE id=1").first();
    let details={};try{details=JSON.parse(current.details||'{}')}catch{}
    if(body.details!==undefined&&body.details!==null){
      const d=body.details;
      if(!d||typeof d!=='object'||typeof d.locality!=='string'||d.locality.trim().length<2||d.locality.length>100||typeof d.source!=='string'||d.source.length>80||typeof d.impact!=='string'||d.impact.length>300||typeof d.need!=='string'||d.need.length>120||!['Pendiente de verificar','Verificado en el ejercicio'].includes(d.verification)||typeof d.reportedAt!=='string'||Number.isNaN(Date.parse(d.reportedAt)))return Response.json({error:'Datos del expediente inválidos'},{status:400});
      details={...details,locality:d.locality.trim(),source:d.source,impact:d.impact.trim(),need:d.need,verification:d.verification,reportedAt:d.reportedAt,supportRequested:d.supportRequested===true||details.supportRequested===true};
    }
    if(stage===2){const a=body.assignment||{};if(a.shelter!=='Auditorio Municipal'||!['Brigada Atempan 01','Brigada Atempan 02'].includes(a.brigade))return Response.json({error:'Asignación inválida'},{status:400});details={...details,shelter:a.shelter,brigade:a.brigade,taskStatus:'Asignada'}}
    if(stage===3)details={...details,taskStatus:'Recibida por la brigada'};
    if(stage===0)details={};
    const now = new Date().toISOString();
    let history=[];try{history=JSON.parse(current.history||'[]')}catch{}
    const titles=['Ejercicio reiniciado','Incidente registrado o actualizado','Asignación confirmada','Brigada acusó recibo'];
    history=stage===0?[]:[...history,{stage,title:titles[stage],created:now,actor:stage===3?(details.brigade||'Brigada Atempan 01'):'Coordinación municipal',summary:stage===1?`${count} personas · ${details.locality||'Atempan'}${details.supportRequested?' · apoyo regional solicitado':''}`:stage===2?`${details.shelter} · ${details.brigade}`:`Tarea recibida por ${details.brigade}`}];
    const result = await db.prepare(`UPDATE exercise SET stage=?, count=CASE WHEN ?=1 THEN ? ELSE count END, updated=?, assigned=CASE WHEN ?=2 THEN ? WHEN ?<2 THEN NULL ELSE assigned END, received=CASE WHEN ?=3 THEN ? ELSE NULL END, details=?, history=? WHERE id=1 AND updated=? AND (?=0 OR (?=stage+1 AND (?!=2 OR count<=40)) OR (?=stage AND ?=1))`).bind(stage,stage,count,now,stage,now,stage,stage,now,JSON.stringify(details),JSON.stringify(history),revision,stage,stage,stage,stage,stage).run();
    if (!result.meta.changes) return new Response(null,{status:409});
  } else if(request.method !== 'GET') return new Response(null,{status:405});
  const row=await db.prepare("SELECT stage,count,updated,assigned,received,details,history FROM exercise WHERE id=1").first();
  try{row.details=JSON.parse(row.details||'{}')}catch{row.details={}}
  try{row.history=JSON.parse(row.history||'[]')}catch{row.history=[]}
  return Response.json(row,{headers:{'Cache-Control':'no-store'}});
}

async function routeReports(request,db){
  await db.prepare("CREATE TABLE IF NOT EXISTS route_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, town INTEGER NOT NULL, street TEXT NOT NULL, latitude REAL, longitude REAL, hazard TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'medium', impact TEXT NOT NULL DEFAULT 'blocked', note TEXT NOT NULL DEFAULT '', photo TEXT, created TEXT NOT NULL)").run();
  const columns=await db.prepare("PRAGMA table_info(route_reports)").all(),names=(columns.results||[]).map(column=>column.name);
  if(!names.includes('severity'))await db.prepare("ALTER TABLE route_reports ADD COLUMN severity TEXT NOT NULL DEFAULT 'medium'").run();
  if(!names.includes('impact'))await db.prepare("ALTER TABLE route_reports ADD COLUMN impact TEXT NOT NULL DEFAULT 'blocked'").run();
  if(!names.includes('latitude'))await db.prepare('ALTER TABLE route_reports ADD COLUMN latitude REAL').run();
  if(!names.includes('longitude'))await db.prepare('ALTER TABLE route_reports ADD COLUMN longitude REAL').run();
  if(request.method==='POST'){
    if(request.headers.get('Origin')!==new URL(request.url).origin)return new Response(null,{status:403});
    let body;try{body=await request.json()}catch{return Response.json({error:'JSON inválido'},{status:400})}
    const prefixes={0:'cholula',1:'atempan'};
    const hazards=['derrumbe','socavon','inundacion','obstruccion','otro'];
    const {town,street,hazard,severity='medium',impact='blocked',note='',photo=null,latitude,longitude}=body||{};
    const validPoint=Number.isFinite(latitude)&&Number.isFinite(longitude)&&latitude>=17.5&&latitude<=21.3&&longitude>=-99.3&&longitude<=-96.3;
    if(!Number.isInteger(town)||!prefixes[town]||typeof street!=='string'||street.length>100||!validPoint||!hazards.includes(hazard)||!['low','medium','high'].includes(severity)||!['blocked','partial','passable'].includes(impact)||typeof note!=='string'||note.length>350)return Response.json({error:'Reporte inválido'},{status:400});
    if(photo!==null&&(typeof photo!=='string'||photo.length>210000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)))return Response.json({error:'Foto inválida o demasiado grande'},{status:413});
    const created=new Date().toISOString();
    await db.prepare("INSERT INTO route_reports (town,street,latitude,longitude,hazard,severity,impact,note,photo,created) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(town,street,latitude,longitude,hazard,severity,impact,note.trim(),photo,created).run();
  }else if(request.method!=='GET')return new Response(null,{status:405});
  const reports=await db.prepare("SELECT id,town,street,latitude,longitude,hazard,severity,impact,note,created,CASE WHEN photo IS NULL THEN 0 ELSE 1 END AS hasPhoto FROM route_reports ORDER BY id DESC LIMIT 50").all();
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
