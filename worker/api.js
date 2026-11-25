async function operationalAccount(request, configuredAccounts){
  if(!configuredAccounts)return {role:'demo'};
  const token=request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if(!token||token.length<24||token.length>256)return null;
  let accounts;
  try{accounts=JSON.parse(configuredAccounts)}catch{return null}
  if(!Array.isArray(accounts))return null;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  return accounts.find(account=>account?.sha256===hash&&typeof account.name==='string'&&
    (account.role==='coordinacion'||(account.role==='brigada'&&['Brigada Atempan 01','Brigada Atempan 02'].includes(account.brigade))))||null;
}

async function state(request, db, configuredAccounts) {
  const account=await operationalAccount(request,configuredAccounts);
  if(!account)return Response.json({error:'Ingresa tu clave institucional.'},{status:401});
  const coordinator=account.role!=='brigada';
  if(account.role!=='demo'&&new URL(request.url).searchParams.has('session'))
    return Response.json({name:account.name,role:account.role,brigade:account.brigade});
  const query=new URL(request.url).searchParams;
  const id=Number(query.get('id')||1);
  if(!Number.isSafeInteger(id)||id<1)return new Response(null,{status:400});
  await db.prepare("CREATE TABLE IF NOT EXISTS exercise (id INTEGER PRIMARY KEY, stage INTEGER NOT NULL, count INTEGER NOT NULL, updated TEXT NOT NULL, assigned TEXT, received TEXT, details TEXT NOT NULL DEFAULT '{}', history TEXT NOT NULL DEFAULT '[]')").run();
  const columns=await db.prepare("PRAGMA table_info(exercise)").all(),names=(columns.results||[]).map(column=>column.name);
  if(!names.includes('details'))await db.prepare("ALTER TABLE exercise ADD COLUMN details TEXT NOT NULL DEFAULT '{}'").run();
  if(!names.includes('history'))await db.prepare("ALTER TABLE exercise ADD COLUMN history TEXT NOT NULL DEFAULT '[]'").run();
  await db.prepare("INSERT OR IGNORE INTO exercise (id,stage,count,updated) VALUES (1,1,35,'2026-11-24T15:00:00Z')").run();
  if(query.has('list')&&request.method==='GET'){
    const {results}=await db.prepare('SELECT id,stage,count,updated,details FROM exercise ORDER BY id DESC').all();
    return Response.json(results.map(row=>{
      const details=JSON.parse(row.details||'{}');
      return {id:row.id,stage:row.stage,locality:details.locality||'Atempan',brigade:details.brigade,parentId:details.parentId,closed:Boolean(details.closedAt)};
    }).filter(row=>coordinator||row.brigade===account.brigade),{headers:{'Cache-Control':'no-store'}});
  }
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== new URL(request.url).origin) return new Response(null,{status:403});
    let body;try{body=await request.json()}catch{return Response.json({error:'JSON inválido'},{status:400})}
    if(query.has('new')){
      if(!coordinator)return new Response(null,{status:403});
      const now=new Date().toISOString();
      const parentId=body?.parentId;
      let initial={};
      if(parentId!==undefined){
        if(!Number.isSafeInteger(parentId)||parentId<1)return new Response(null,{status:400});
        const parent=await db.prepare('SELECT stage,details FROM exercise WHERE id=?').bind(parentId).first();
        if(!parent?.stage)return new Response(null,{status:404});
        const parentDetails=JSON.parse(parent.details||'{}');
        if(parentDetails.closedAt||parentDetails.parentId)return new Response(null,{status:409});
        initial={parentId,locality:parentDetails.locality||'Atempan'};
      }
      const result=await db.prepare('INSERT INTO exercise (stage,count,updated,details) VALUES (0,1,?,?)').bind(now,JSON.stringify(initial)).run();
      return Response.json({id:Number(result.meta.last_row_id??result.meta.lastInsertRowid)},{status:201});
    }
    const {stage,count,revision}=body||{};
    if (![0,1,2,3].includes(stage) || !Number.isInteger(count) || count<1 || count>9999 || typeof revision !== 'string') return new Response(null,{status:400});
    const current=await db.prepare("SELECT stage,count,updated,assigned,received,details,history FROM exercise WHERE id=?").bind(id).first();
    if(!current)return new Response(null,{status:404});
    let details={};try{details=JSON.parse(current.details||'{}')}catch{}
    if(body.details!==undefined&&body.details!==null){
      const d=body.details;
      if(!d||typeof d!=='object'||typeof d.locality!=='string'||d.locality.trim().length<2||d.locality.length>100||typeof d.source!=='string'||d.source.length>80||typeof d.impact!=='string'||d.impact.length>300||typeof d.need!=='string'||d.need.length>120||!['Pendiente de verificar','Verificado','Verificado en el ejercicio'].includes(d.verification)||typeof d.reportedAt!=='string'||Number.isNaN(Date.parse(d.reportedAt)))return Response.json({error:'Datos del expediente inválidos'},{status:400});
      details={...details,locality:d.locality.trim(),source:d.source,impact:d.impact.trim(),need:d.need,verification:d.verification,reportedAt:d.reportedAt,supportRequested:d.supportRequested===true||details.supportRequested===true};
    }
    if(!coordinator&&(details.brigade!==account.brigade||stage!==3||body.details||body.assignment||body.radio||body.operation||
      (current.stage===3&&!body.attention)))return new Response(null,{status:403});
    if(account.role==='coordinacion'&&(current.stage===2&&stage===3||body.attention?.fromBrigade))
      return new Response(null,{status:403});
    const now=new Date().toISOString();
    const operation=body.operation;
    if(body.attention?.id&&(details.progressIds||[]).includes(body.attention.id))
      return Response.json({...current,id,details,history:JSON.parse(current.history||'[]')});
    if(details.closedAt&&stage!==0)return Response.json({error:'El incidente está cerrado.'},{status:409});
    if(operation?.type==='resources'){
      const {capacity,open,access,available}=operation;
      if(stage!==1||current.stage!==1||!Number.isInteger(capacity)||capacity<0||capacity>500||
        typeof open!=='boolean'||typeof access!=='boolean'||!Array.isArray(available)||
        available.some(name=>!['Brigada Atempan 01','Brigada Atempan 02'].includes(name))){
        return Response.json({error:'Recursos inválidos para este folio.'},{status:400});
      }
      details.resources={capacity,open,access,available:[...new Set(available)],updated:now};
    }
    if(operation?.type==='validate'){
      if(stage!==3||current.stage!==3||!details.attention||details.needClosedAt||
        !['Pendiente','Parcial','Completa'].includes(operation.result)||
        typeof operation.note!=='string'||!operation.note.trim()||operation.note.length>300){
        return Response.json({error:'Validación inválida.'},{status:400});
      }
      details.validation={result:operation.result,note:operation.note.trim(),updated:now};
    }
    if(operation?.type==='close-need'){
      if(stage!==3||current.stage!==3||details.validation?.result!=='Completa'||details.needClosedAt)
        return Response.json({error:'Valida la atención completa antes de cerrar la necesidad.'},{status:400});
      details.needClosedAt=now;
    }
    if(operation?.type==='close-case'){
      if(stage!==3||current.stage!==3||!details.needClosedAt)
        return Response.json({error:'Cierra la necesidad antes de cerrar el expediente.'},{status:400});
      const {results:children}=await db.prepare("SELECT details FROM exercise WHERE json_extract(details,'$.parentId')=?").bind(id).all();
      if(children.some(child=>!JSON.parse(child.details).closedAt))
        return Response.json({error:'Cierra las necesidades vinculadas antes de cerrar el expediente.'},{status:400});
      details.closedAt=now;
    }
    if(operation&&!['resources','validate','close-need','close-case'].includes(operation.type))return new Response(null,{status:400});
    if(stage===2){
      const resources=details.resources;
      if(details.verification==='Pendiente de verificar')
        return Response.json({error:'Verifica la información del incidente antes de asignar.'},{status:400});
      if(resources?(!resources.open||!resources.access||resources.capacity<current.count||!resources.available.includes(body.assignment?.brigade)):current.count>40)
        return Response.json({error:'No hay recursos confirmados suficientes.'},{status:400});
    }
    if(stage===2){const a=body.assignment||{};if(a.shelter!=='Auditorio Municipal'||!['Brigada Atempan 01','Brigada Atempan 02'].includes(a.brigade))return Response.json({error:'Asignación inválida'},{status:400});details={...details,shelter:a.shelter,brigade:a.brigade,taskStatus:'Asignada'}}
    if(stage===3&&!body.radio&&!body.attention)details={...details,taskStatus:'Recibida por la brigada'};
    if(stage===0)details=details.parentId?{parentId:details.parentId}:{};
    const radio=body.radio;
    const attention=body.attention;
    const actor=account.name||(stage===3&&!operation&&(!attention||attention.fromBrigade===true)?(details.brigade||'Brigada Atempan 01'):'Coordinación municipal');
    if(attention!==undefined&&attention!==null){
      if(radio||operation||details.needClosedAt||stage!==3||current.stage!==3||
        !['Pendiente','En atención','Parcial','Atendida'].includes(attention.status)||
        typeof attention.note!=='string'||!attention.note.trim()||attention.note.length>300){
        return Response.json({error:'Seguimiento inválido para este folio'},{status:400});
      }
      if(attention.id!==undefined&&(typeof attention.id!=='string'||!/^[-a-f0-9]{36}$/i.test(attention.id)))
        return new Response(null,{status:400});
      details={...details,validation:null,attention:{status:attention.status,note:attention.note.trim(),updated:now,actor}};
      if(attention.id){
        details.progressIds=[...(details.progressIds||[]),attention.id];
        details.radioMessages=(details.radioMessages||[]).map(message=>message.reference===attention.id?{...message,linked:true}:message);
      }
    }
    if(radio){
      if(stage!==3||current.stage!==3||typeof radio.id!=='string'||!/^[0-9a-f-]{36}$/i.test(radio.id)){
        return Response.json({error:'Acción de radio inválida para este folio'},{status:400});
      }
      const messages=details.radioMessages||[];
      const existing=messages.find(message=>message.id===radio.id);
      if(typeof radio.text==='string'){
        const text=radio.text.trim();
        if(radio.type!==undefined&&!['report','instruction'].includes(radio.type))return new Response(null,{status:400});
        if(!text||text.length>320||messages.length>=30||existing)return new Response(null,{status:409});
        const reference=String(radio.reference||'').trim().toLowerCase();
        if(reference&&(radio.type!=='report'||!/^[-a-f0-9]{36}$/.test(reference)))return new Response(null,{status:400});
        if(reference&&messages.some(message=>message.reference===reference))return new Response(null,{status:409});
        details.radioMessages=[...messages,{id:radio.id,text,type:radio.type||'report',sentAt:now,actor,
          ...(reference?{reference,linked:(details.progressIds||[]).includes(reference)}:{})}];
      }else{
        if(!existing||existing.receivedAt)return new Response(null,{status:409});
        details.radioMessages=messages.map(message=>message.id===radio.id?{...message,receivedAt:now,ackActor:actor}:message);
      }
    }
    let history=[];try{history=JSON.parse(current.history||'[]')}catch{}
    const titles=['Ejercicio reiniciado','Incidente registrado o actualizado','Asignación confirmada','Brigada acusó recibo'];
    const operationTitles={resources:'Recursos verificados',validate:'Resultado validado','close-need':'Necesidad cerrada','close-case':'Expediente cerrado'};
    history=radio?[...history,{stage,title:radio.text?'Comunicación registrada':'Acuse registrado',created:now,actor,summary:radio.text?'Captura por radio':'Confirmación por radio'}]:stage===0?[]:[...history,{stage,title:operation?operationTitles[operation.type]:attention?'Seguimiento actualizado':titles[stage],created:now,actor,summary:operation?(operation.result?operation.result+' · '+details.validation.note:('Folio '+id)):attention?`${details.attention.status} · ${details.attention.note}`:stage===1?`${count} personas · ${details.locality||'Atempan'}${details.supportRequested?' · apoyo regional solicitado':''}`:stage===2?`${details.shelter} · ${details.brigade}`:`Tarea recibida por ${details.brigade}`}];
    const result = await db.prepare(`UPDATE exercise SET stage=?, count=CASE WHEN ?=1 THEN ? ELSE count END, updated=?, assigned=CASE WHEN ?=2 THEN ? WHEN ?<2 THEN NULL ELSE assigned END, received=CASE WHEN ?=3 THEN COALESCE(received, ?) ELSE NULL END, details=?, history=? WHERE id=? AND updated=? AND (?=0 OR (?=stage+1) OR (?=stage AND (?=1 OR (?=3 AND ?=1))))`).bind(stage,stage,count,now,stage,now,stage,stage,now,JSON.stringify(details),JSON.stringify(history),id,revision,stage,stage,stage,stage,stage,radio||attention||operation?1:0).run();
    if (!result.meta.changes) return new Response(null,{status:409});
  } else if(request.method !== 'GET') return new Response(null,{status:405});
  const row=await db.prepare("SELECT stage,count,updated,assigned,received,details,history FROM exercise WHERE id=?").bind(id).first();
  if(!row)return new Response(null,{status:404});
  row.id=id;
  try{row.details=JSON.parse(row.details||'{}')}catch{row.details={}}
  if(!coordinator&&row.details.brigade!==account.brigade)return new Response(null,{status:403});
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
