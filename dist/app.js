const paths={inicio:'M3 10 12 3l9 7v11h-6v-7H9v7H3z',avisos:'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4z M10 20h4',refugios:'M12 22s8-9 8-14a8 8 0 1 0-16 0c0 5 8 14 8 14z M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',contactos:'M5 3h4l2 5-3 2q2 5 6 6l2-3 5 2v4q0 3-4 2Q4 18 3 6z',policia:'M12 2 20 5v6c0 5-3.5 8.7-8 11-4.5-2.3-8-6-8-11V5z M12 6v11',bomberos:'M7 22h10V11H7z M9 11V5h6v6 M12 2v3 M7 15H4v4h3 M17 15h3v4h-3',ambulancia:'M2 7h12v11H2z M14 11h4l4 4v3h-8z M6 18a2 2 0 1 0 4 0 M17 18a2 2 0 1 0 4 0 M6 12h4 M8 10v4',guia:'M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1z M12 6v14',coord:'M4 5h16v16H4z M8 9h8 M8 13h8 M8 17h5',rutas:'M4 20 9 5l6 14 5-12 M7 12h5 M14 15h5'};
paths.mapa='M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15';paths.planes=paths.guia;
Object.assign(paths,{
  hogar:'M3 10 12 3l9 7v11H3z M9 21v-7h6v7',
  suministros:'M3 8h18v13H3z M3 8l3-5h12l3 5 M9 12h6',
  documentos:'M7 3h7l4 4v14H7z M14 3v5h5 M10 12h5 M10 16h5',
  lluvia:'M5 14a4 4 0 1 1 2-7 5 5 0 0 1 9-1 4 4 0 1 1 3 8 M8 17l-1 3 M13 17l-1 3 M18 17l-1 3',
  volcan:'M3 20l6-12 2 3 2-3 8 12z M11 6V3 M15 6l2-2',
  sismo:'M3 12h4l2-6 4 12 3-9 2 3h3',
  radio:'M7 10h10v11H7z M10 10V4 M10 14h4 M10 17h2 M14 4a5 5 0 0 1 3 3 M16 2a8 8 0 0 1 4 5',
});
const planArtwork={
  lluvias:{image:'LLUVIAS.jpeg',icon:'lluvia'},
  sismos:{image:'SISMO.jpeg',icon:'sismo'},
  volcan:{image:'POPOCATEPETL.jpg',icon:'volcan'},
};
const icon=k=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="'+paths[k]+'"/></svg>';
const labels={inicio:'Inicio',avisos:'Avisos',mapa:'Mi localidad',refugios:'Refugios',guia:'Mi plan',contactos:'Contactos'};
const profilePicker=document.querySelector('#profile-role');
const profiles={
  ciudadania:{start:'inicio',pages:labels},
  coordinacion:{start:'inicio-coord',pages:{'inicio-coord':'Inicio',coord:'Expediente municipal',refugios:'Refugios'}},
  brigada:{start:'inicio-brigada',pages:{'inicio-brigada':'Inicio',brigada:'Mis tareas',contactos:'Contactos'}},
};
let profile='ciudadania';
try{
  const previous=localStorage.getItem('sicep.profile');
  if(Object.hasOwn(profiles,previous))profile=previous;
}catch{}
const pageProfile={inicio:'ciudadania',avisos:'ciudadania',mapa:'ciudadania',planes:'ciudadania',guia:'ciudadania','inicio-coord':'coordinacion',coord:'coordinacion','inicio-brigada':'brigada',brigada:'brigada'};
const profileIcons={'inicio-coord':'inicio','inicio-brigada':'inicio',brigada:'coord'};
function setProfile(value){
  profile=value;
  profilePicker.value=value;
  try{localStorage.setItem('sicep.profile',value)}catch{}
}
profilePicker.addEventListener('change',()=>{
  setProfile(profilePicker.value);
  const destination='#'+profiles[profile].start;
  if(location.hash===destination)render();
  else location.hash=destination;
});
const towns=['San Pedro Cholula','Atempan'];
const ruralFilterPages=new Set(['inicio','avisos','refugios','mapa','rutas']);
let ruralCatalog=null;
let ruralCatalogStatus='idle';
let ruralMunicipalityCode='21017';
let ruralLocalityCode='';
const ruralMunicipality=()=>ruralCatalog?.find(([code])=>code===ruralMunicipalityCode);
const ruralLocality=()=>ruralMunicipality()?.[2].find(([code])=>code===ruralLocalityCode);
const ruralMunicipalityName=()=>ruralMunicipality()?.[1]||'Atempan';
const ruralScope=()=>ruralLocality()?`${ruralLocality()[1]}, ${ruralMunicipalityName()}`:ruralMunicipalityName();
const ruralRouteTown=()=>towns.indexOf(ruralMunicipalityName());

async function loadRuralCatalog(){
  if(ruralCatalogStatus!=='idle')return;
  ruralCatalogStatus='loading';
  try{
    const response=await fetch('assets/localidades-rurales-puebla.json');
    if(!response.ok)throw Error('Catálogo no disponible');
    const data=await response.json();
    if(!Array.isArray(data)||!data.length)throw Error('Catálogo vacío');
    ruralCatalog=data;
    ruralCatalogStatus='ready';
  }catch{ruralCatalogStatus='error'}
  if(ruralFilterPages.has(location.hash.slice(1).split('/')[0]||'inicio')){
    riskMapInstance?.remove();
    riskMapInstance=null;
    riskMapView=null;
    render();
  }
}

function ruralFilters(){
  const municipality=ruralMunicipality();
  const disabled=municipality?'':' disabled';
  return `<div class="rural-filters" aria-label="Ubicación rural" role="group">
    <label>Municipio<select id="rural-municipality"${disabled}>
      ${ruralCatalog?ruralCatalog.map(([code,name])=>`<option value="${code}"${code===ruralMunicipalityCode?' selected':''}>${escapeHTML(name)}</option>`).join(''):'<option>Catálogo de Puebla</option>'}
    </select></label>
    <label>Localidad rural<select id="rural-locality"${disabled}><option value="">Todas las localidades rurales</option>
      ${municipality?municipality[2].map(([code,name])=>`<option value="${code}"${code===ruralLocalityCode?' selected':''}>${escapeHTML(name)}</option>`).join(''):''}
    </select></label>
    ${ruralCatalogStatus==='error'?'<p role="status">No se pudo cargar el catálogo. <button type="button" class="route-refresh" data-retry-rural>Reintentar</button></p>':''}
  </div>`;
}

const places=[
['Refugio temporal de Cholula','Av. 14 Poniente 307, Centro',0,'Abierto','Rampa de entrada y sanitarios accesibles.'],
['Refugio Deportivo Santiago','Calle 9 Norte s/n, Barrio de Santiago',0,'Abierto','Accesibilidad pendiente de confirmar.'],
['Auditorio Municipal','Palacio Municipal',1,'Abierto','Acceso verificado en el ejercicio. Capacidad nominal de 500 personas.'],
['Esc. 1º de enero','2 Sur y 3 Oriente',1,'Acceso bloqueado','Capacidad nominal de 300 personas.'],
['Esc. Manuel Acuña Hernández','Av. Benito Juárez 147, Tacopan',1,'Sin confirmar','Capacidad nominal de 250 personas.'],
['Esc. Ignacio Zaragoza','Ignacio Zaragoza #2',1,'Sin confirmar','Capacidad nominal de 400 personas.'],
['Esc. Benito Juárez','Ignacio Zaragoza #1',1,'Sin confirmar','Capacidad nominal de 300 personas.'],
['Esc. Primaria Lic. Adolfo López Mateos','Domicilio conocido',2,'Sin confirmar','Capacidad nominal de 50 personas.'],
['Esc. Primaria de Cuautieco','Domicilio conocido',2,'Sin confirmar','Capacidad nominal de 100 personas.'],
['Auditorio Municipal de El Terrero','Domicilio conocido',2,'Sin confirmar','Capacidad nominal de 200 personas.']];
const shelterTowns=[...towns,'Aquixtla'];
const ruralShelters={
  5:{locality:'Apatauyan',point:[19.8031536,-97.443235]},
  6:{locality:'Tezhuatepec',point:[19.8113283,-97.4625536]},
  7:{locality:'Chichicaxtla',point:[19.7443775,-97.9717225]},
  8:{locality:'Cuautieco',point:[19.7841914,-97.9232736]},
  9:{locality:'El Terrero',point:[19.7868419,-97.95361]},
};
const shelterPlan='https://proteccioncivil.puebla.gob.mx/images/site/planes/PLAN-HIDROMETEOROLOGICO.pdf';
let town=1,mode='lista',zoom=1,incident=null,coordEditing=false;
let shelterQuery='',shelterStatus='',shelterMapId=null;
let hazardLayer='rain';
let roadReports=[],roadBlocked=[],roadMode='cargando',roadLoading=false,routeDestination=null,routeOrigin=null,routeReportPoint=null,routeMapMode='origin',routeResult=null,routeMapInstance=null,routeMapLayers=null,routeRequestId=0,routeNotice='';
let revision='',connection='Cargando registro municipal…';
const hosted=location.protocol!=='file:';
const townCenters=[[19.0505,-98.3070],[19.8295,-97.4592]];
const refugeCoordinates={0:{0:[19.0640,-98.3055],1:[19.0578,-98.3160]},1:{2:[19.8377,-97.4580]}};
const hazardLabels={derrumbe:'Derrumbe o deslave',socavon:'Socavón',inundacion:'Inundación o corriente',obstruccion:'Calle obstruida',otro:'Otro peligro'};
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function localRoadReports(){try{const v=JSON.parse(localStorage.getItem('sicep.route-reports.v1')||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function numberedReportsForTown(townIndex){return roadReports.filter(r=>Number(r.town)===townIndex).sort((a,b)=>(Date.parse(a.created)||0)-(Date.parse(b.created)||0)||String(a.id).localeCompare(String(b.id))).map((report,index)=>({report,number:index+1})).slice(-30).reverse()}
function mergeRoadReports(remote){
  const local=localRoadReports();
  const pending=local.filter(draft=>!remote.some(saved=>Number(saved.town)===Number(draft.town)&&saved.hazard===draft.hazard&&Math.abs(Number(saved.latitude)-Number(draft.latitude))<.0001&&Math.abs(Number(saved.longitude)-Number(draft.longitude))<.0001&&Math.abs(new Date(saved.created).getTime()-new Date(draft.created).getTime())<120000));
  return [...pending,...remote];
}
async function refreshRoadReports(){
  if(roadLoading)return;
  roadLoading=true;let next,blocked,mode;
  try{
    if(!hosted)throw Error('local');
    const response=await fetch('/api/routes',{cache:'no-store'});
    if(!response.ok)throw Error('API no disponible');
    const data=await response.json();next=mergeRoadReports(data.reports||[]);blocked=[...new Set(next.filter(r=>r.impact==='blocked').map(r=>r.town+':'+r.street))];mode='compartido';
  }catch{
    next=localRoadReports();blocked=[...new Set(next.filter(r=>(r.impact||'blocked')==='blocked').map(r=>r.town+':'+r.street))];mode='local';
  }
  roadLoading=false;
  const changed=JSON.stringify(roadReports)!==JSON.stringify(next)||JSON.stringify(roadBlocked)!==JSON.stringify(blocked)||roadMode!==mode;
  roadReports=next;roadBlocked=blocked;roadMode=mode;
  if(changed&&location.hash==='#rutas')render();
}
let caseId=1,caseDirectory=[],caseSyncVersion=0,replayingReports=false;
let coordinationSection='';
const operatorSessionKey='sicep.operator-session.v1';
const operatorSnapshotKey='sicep.operator-snapshot.v1';
let operationalToken='',operationalRole='',operatorKey='',institutionalRequired=false;
try{
  const session=JSON.parse(sessionStorage.getItem(operatorSessionKey));
  if(session?.token&&['brigada','coordinacion'].includes(session.role)&&session.key){
    operationalToken=session.token;
    operationalRole=session.role;
    operatorKey=session.key;
    institutionalRequired=true;
    const snapshot=readOperatorSnapshot();
    if(snapshot){
      caseId=snapshot.data.id;
      incident=snapshot.data;
      revision=incident.updated;
      caseDirectory=snapshot.entries;
    }
  }
}catch{}
function readOperatorSnapshot(){
  try{
    const snapshot=JSON.parse(sessionStorage.getItem(operatorSnapshotKey));
    return operationalRole==='brigada'&&snapshot?.key===operatorKey?snapshot:null;
  }catch{return null}
}
function saveOperatorSnapshot(data,entries){
  if(operationalRole!=='brigada')return;
  try{sessionStorage.setItem(operatorSnapshotKey,JSON.stringify({key:operatorKey,data,entries}))}catch{}
}
function clearOperatorSession(){
  operationalToken='';
  operationalRole='';
  operatorKey='';
  try{
    sessionStorage.removeItem(operatorSessionKey);
    sessionStorage.removeItem(operatorSnapshotKey);
  }catch{}
}
function operationalFetch(url,options={}){
  const headers=new Headers(options.headers);
  if(operationalToken)headers.set('Authorization','Bearer '+operationalToken);
  return fetch(url,{...options,headers});
}
function operationalLogin(){
  return `<section class="card case-form"><h1>Acceso institucional</h1><form id="operational-login" class="case-form">
    <label>Clave de acceso<input name="token" type="password" autocomplete="current-password" required></label>
    <button>Entrar</button><p role="alert"></p>
  </form></section>`;
}
const caseEndpoint=id=>'/api/situation?id='+id;
const caseFolio=(id=caseId)=>'SICEP-AT-'+String(id).padStart(3,'0');
const reportQueueKey='sicep.field-reports.v1';
const caseCacheKey='sicep.case-cache.v1';
function readCaseStorage(key,fallback){
  try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}
}
function cacheCase(data){
  const cache=readCaseStorage(caseCacheKey,{});
  localStorage.setItem(caseCacheKey,JSON.stringify({...cache,[data.id||caseId]:data}));
}
async function replayReports(){
  if(replayingReports)return;
  replayingReports=true;
  const queueOperator=operatorKey;
  try{
    for(const item of readCaseStorage(reportQueueKey,[])){
      if(queueOperator!==operatorKey)break;
      if((item.operatorKey||'')!==queueOperator)continue;
      const response=await operationalFetch(caseEndpoint(item.caseId),{cache:'no-store'});
      if(!response.ok)continue;
      const data=await response.json();
      if(queueOperator!==operatorKey)break;
      const saved=await operationalFetch(caseEndpoint(item.caseId),{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({stage:3,count:data.count,revision:data.updated,attention:item.attention}),
      });
      if(!saved.ok)continue;
      const queue=readCaseStorage(reportQueueKey,[]).filter(entry=>entry.attention.id!==item.attention.id);
      localStorage.setItem(reportQueueKey,JSON.stringify(queue));
    }
  }catch{}finally{replayingReports=false}
}
async function sync(){
  if(!hosted){try{incident=JSON.parse(localStorage.getItem('sicep.demo.v1')||'{"stage":1,"count":35}')}catch{}connection='Registro local';render();return}
  const id=caseId,version=++caseSyncVersion;
  try{
    await replayReports();
    const [response,directory]=await Promise.all([
      operationalFetch(caseEndpoint(id),{cache:'no-store'}),
      operationalFetch('/api/situation?list',{cache:'no-store'}),
    ]);
    if(directory.status===401){
      if(version!==caseSyncVersion)return;
      institutionalRequired=true;
      clearOperatorSession();
      incident=null;
      caseDirectory=[];
      render();
      return;
    }
    if(response.status===403&&directory.ok&&operationalRole==='brigada'){
      if(version!==caseSyncVersion)return;
      const entries=await directory.json();
      if(version!==caseSyncVersion)return;
      caseDirectory=entries;
      try{sessionStorage.removeItem(operatorSnapshotKey)}catch{}
      if(caseDirectory.length){selectCase(caseDirectory[0].id);return}
      incident=null;connection='Registro municipal compartido';render();return;
    }
    if(!response.ok||!directory.ok)throw Error();
    const [data,entries]=await Promise.all([response.json(),directory.json()]);
    if(version!==caseSyncVersion)return;
    const changed=revision!==data.updated||incident?.id!==id||
      JSON.stringify(caseDirectory)!==JSON.stringify(entries)||connection!=='Registro municipal compartido';
    caseDirectory=entries;
    if(institutionalRequired)saveOperatorSnapshot(data,entries);
    try{if(!institutionalRequired){cacheCase(data);localStorage.setItem('sicep.case-directory.v1',JSON.stringify(entries))}}catch{}
    revision=data.updated;incident=data;connection='Registro municipal compartido';
    if(changed)render();
  }catch{
    if(version!==caseSyncVersion)return;
    if(!institutionalRequired){
      caseDirectory=readCaseStorage('sicep.case-directory.v1',[]);
      incident=readCaseStorage(caseCacheKey,{})[id]||null;
    }
    revision=incident?.updated||'';
    if(connection!=='Sin conexión · copia del último expediente recibido'){connection='Sin conexión · copia del último expediente recibido';render()}
  }
}
window.addEventListener('online',()=>sync());

function selectCase(id){
  if(id===caseId)return;
  caseId=id;
  coordinationSection='';
  const snapshot=readOperatorSnapshot();
  incident=institutionalRequired?(snapshot?.data.id===id?snapshot.data:null):(readCaseStorage(caseCacheKey,{})[id]||null);
  revision=incident?.updated||'';
  coordEditing=false;
  render();
  sync();
}
function saveLocalExercise(stage,count,details,assignment,radio,attention,operation){
  const now=new Date().toISOString(),old=incident||{},nextDetails={...(old.details||{}),...(details||{})};
  if(operation?.type==='resources'){
    const {capacity,open,access,available}=operation;
    nextDetails.resources={capacity,open,access,available,updated:now};
  }
  if(stage===2){
    const resources=nextDetails.resources;
    if(!['Verificado','Verificado en el ejercicio'].includes(nextDetails.verification)||
      !resources?.updated||!resources.open||!resources.access||resources.capacity<old.count||
      !resources.available.includes(assignment?.brigade)){
      throw Error('Verifica el reporte y confirma los recursos antes de asignar.');
    }
  }
  if(stage===2)Object.assign(nextDetails,{shelter:assignment?.shelter||'Auditorio Municipal',brigade:assignment?.brigade||'Brigada Atempan 01',taskStatus:'Asignada'});
  if(stage===3)nextDetails.taskStatus='Recibida por la brigada';
  if(radio){
    if(old.stage!==3)throw Error('Primero acepta la tarea desde la vista de brigada.');
    const messages=nextDetails.radioMessages||[];
    if(radio.text){
      if(messages.length>=30)throw Error('La bitácora del folio está llena.');
      nextDetails.radioMessages=[...messages,{id:radio.id,text:radio.text,type:radio.type||'report',sentAt:now}];
    }else{
      nextDetails.radioMessages=messages.map(message=>message.id===radio.id&&!message.receivedAt?
        {...message,receivedAt:now}:message);
    }
  }
  const actor=stage===3&&(!attention||attention.fromBrigade)?(nextDetails.brigade||'Brigada Atempan 01'):'Coordinación municipal';
  if(attention)nextDetails.attention={status:attention.status,note:attention.note,updated:now,actor};
  const titles=['Ejercicio reiniciado','Incidente registrado o actualizado','Asignación confirmada','Brigada acusó recibo'];
  const history=radio?(old.history||[]):stage===0?[]:[...(old.history||[]),{stage,title:attention?'Seguimiento actualizado':titles[stage],created:now,actor,summary:attention?`${attention.status} · ${attention.note}`:stage===1?`${count} personas · ${nextDetails.locality||'Atempan'}${nextDetails.supportRequested?' · apoyo regional solicitado':''}`:stage===2?`${nextDetails.shelter} · ${nextDetails.brigade}`:`Tarea recibida por ${nextDetails.brigade}`}];
  incident={...old,stage,count:stage===1?count:(old.count||count),details:stage===0?{}:nextDetails,history,updated:now};
  try{localStorage.setItem('sicep.demo.v1',JSON.stringify(incident))}catch{throw Error('No se pudo guardar el expediente en este navegador.')}
  connection='Registro local · datos guardados en este navegador';render();
}
async function update(stage,count,details=null,assignment=null,radio=null,attention=null,operation=null){
  if(!hosted){
    try{saveLocalExercise(stage,count,details,assignment,radio,attention,operation)}catch(error){alert(error.message)}
    return;
  }
  const id=caseId,submissionOperator=operatorKey;
  ++caseSyncVersion;
  try{
    const r=await operationalFetch(caseEndpoint(id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage,count,revision,details,assignment,radio,attention,operation})});
    if(!r.ok){
      if(r.status===409)await sync();
      const message=await r.json().catch(()=>null);
      alert(message?.error||'El cambio no se guardó. Revisa el expediente y vuelve a intentarlo.');
      return;
    }
    const saved=await r.json();
    if(submissionOperator!==operatorKey)return;
    if(institutionalRequired&&caseId===id)saveOperatorSnapshot(saved,caseDirectory);
    try{if(!institutionalRequired)cacheCase(saved)}catch{}
    if(caseId===id){
      if(profile==='coordinacion'&&(assignment||details?.verification==='Verificado'))coordinationSection='';
      incident=saved;revision=saved.updated;render();
    }
    await sync();
  }catch(error){
    if(error instanceof TypeError&&attention?.fromBrigade&&submissionOperator===operatorKey){
      try{
        const queue=readCaseStorage(reportQueueKey,[]);
        localStorage.setItem(reportQueueKey,JSON.stringify([...queue,{caseId:id,attention,operatorKey:submissionOperator}]));
        connection='Sin conexión · avance guardado en este dispositivo';
        render();
      }catch{alert('No se pudo guardar el avance en este navegador.')}
      return;
    }
    alert('El cambio no se guardó. Revisa la conexión y vuelve a intentarlo.');
  }
}
const app=document.querySelector('#app');
const tile=(k,title,sub)=>'<a class="tile" href="#'+k+'"><span class="icon">'+icon(k)+'</span><div><b>'+title+'</b><span class="muted">'+sub+'</span></div><span class="chev">›</span></a>';
const back=(k=profiles[profile].start,label=profiles[profile].pages[k]||'Inicio')=>'<a class="link back" href="#'+k+'">‹ '+label+'</a>';
const pill=p=>'<span class="pill '+(p==='Abierto'?'':'neutral')+'">'+p+'</span>';
const alerts=[
  ['Actividad del Popocatépetl','Amarillo Fase 2 en el escenario de Cholula.','Boletín volcánico de ejemplo'],
  ['Inundación en Atempan','La mesa municipal revisa accesos y disponibilidad para alojar a las familias.','Reporte municipal de ejemplo']
];
const stageName=['Sin incidente registrado','Pendiente de asignación','Brigada asignada','Recepción confirmada'];
const checklist = [
  'Acordar un punto de encuentro con mi familia',
  'Anotar contactos de emergencia fuera del celular',
  'Preparar agua, linterna y medicamentos personales',
  'Guardar copias de documentos importantes',
  'Consultar los refugios de mi municipio'
];
let prepared = [];
try {
  const saved = JSON.parse(localStorage.getItem('sicep.prepared') || '[]');
  if (Array.isArray(saved)) prepared = saved.filter(i => Number.isInteger(i) && i >= 0 && i < checklist.length);
} catch {}
const planAccountKey='sicep.plan.account.v1';
let planSession=null;
let pendingPlanEdit=null;

function curpAge(value){
  const match=/^[A-ZÑ]{4}(\d{2})(\d{2})(\d{2})[HM][A-Z]{2}[A-ZÑ]{3}([A-Z0-9])\d$/.exec(value);
  if(!match)return null;
  const [,yy,mm,dd,century]=match;
  const year=(/\d/.test(century)?1900:2000)+Number(yy),month=Number(mm),day=Number(dd);
  const birth=new Date(Date.UTC(year,month-1,day));
  if(birth.getUTCMonth()!==month-1||birth.getUTCDate()!==day)return null;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const date=Object.fromEntries(today.map(part=>[part.type,Number(part.value)]));
  const age=date.year-year-Number(date.month*100+date.day<month*100+day);
  return age>=0?age:null;
}

function requestPlanEdit(resume){
  pendingPlanEdit=resume;
  const dialog=document.createElement('dialog');
  dialog.className='household-dialog';
  dialog.setAttribute('aria-labelledby','plan-access-title');
  const existing=Boolean(localStorage.getItem(planAccountKey));
  dialog.innerHTML=`
    <h2 id="plan-access-title">Acceso a Mi plan</h2>
    <div class="segment" role="group" aria-label="Tipo de acceso">
      <button type="button" data-plan-mode="login">Iniciar sesión</button>
      <button type="button" data-plan-mode="register">Registrarse</button>
    </div>
    <div data-plan-access-content></div>`;
  const content=dialog.querySelector('[data-plan-access-content]');
  const modes=[...dialog.querySelectorAll('[data-plan-mode]')];
  function showMode(mode){
    const login=mode==='login';
    const hasAccount=Boolean(localStorage.getItem(planAccountKey));
    modes.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.planMode===mode)));
    if(login!==hasAccount){
      content.innerHTML=`<p role="status">${login?'Primero crea una cuenta con la opción Registrarse.':'Ya hay una cuenta para Mi plan en este navegador. Usa Iniciar sesión para acceder a tu plan.'}</p>
        <button type="button" class="household-cancel" data-plan-cancel>Cancelar</button>`;
      return;
    }
    content.innerHTML=`<form>
    <p class="household-privacy">Cuenta local de este navegador. La CURP y el correo se guardan cifrados en este dispositivo.</p>
    ${login?'':'<label>Nombre completo<input name="name" autocomplete="name" maxlength="120" required></label>'}
    <label>CURP<input name="curp" minlength="18" maxlength="18" autocapitalize="characters" spellcheck="false" required></label>
    <label>Correo electrónico<input name="email" type="email" autocomplete="email" maxlength="254" required></label>
    <label>Edad<input name="age" readonly></label>
    <label>Contraseña${login?'':' (mínimo 8 caracteres)'}<input name="password" type="password" autocomplete="${login?'current-password':'new-password'}" minlength="8" required></label>
    <p data-plan-access-error role="alert"></p>
    <div class="household-dialog-actions"><button class="household-cancel" type="button" data-plan-cancel>Cancelar</button><button class="household-save" type="submit">${login?'Iniciar sesión':resume?'Registrarse y continuar':'Registrarse'}</button></div>
  </form>`;
    const form=dialog.querySelector('form'),curpInput=form.elements.curp,submit=form.querySelector('[type=submit]');
    const readCurp=()=>curpInput.value.trim().toUpperCase();
    curpInput.addEventListener('input',()=>{form.elements.age.value=curpAge(readCurp())??''});
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const data=new FormData(form),curp=readCurp(),age=curpAge(curp);
      const email=String(data.get('email')).trim().toLowerCase(),password=String(data.get('password'));
      const error=form.querySelector('[data-plan-access-error]');
      if(age===null){error.textContent='Revisa la estructura y la fecha de nacimiento de la CURP.';return}
      submit.disabled=true;
      modes.forEach(button=>{button.disabled=true});
      error.textContent='';
      try{
        const saved=localStorage.getItem(planAccountKey);
        let account;
        if(Boolean(saved)!==login){showMode(mode);return}
        if(login){
          account=(await decryptVault(JSON.parse(saved),password)).data;
          if(account.curp!==curp||account.email!==email)throw new Error();
        }else{
          const name=String(data.get('name')||'').trim();
          if(!name){error.textContent='Escribe tu nombre completo.';return}
          account={curp,email,name};
          const salt=crypto.getRandomValues(new Uint8Array(16));
          const key=await deriveVaultKey(password,salt);
          const encrypted=await encryptVault(account,key,salt);
          if(!dialog.open)return;
          if(localStorage.getItem(planAccountKey))throw new Error();
          localStorage.setItem(planAccountKey,JSON.stringify(encrypted));
        }
        if(!dialog.open)return;
        planSession={name:account.name,age};
        const action=pendingPlanEdit;
        pendingPlanEdit=null;
        dialog.close();
        updatePlanAccess();
        action?.();
      }catch{
        error.textContent=login?'Revisa la CURP, el correo y la contraseña.':'No se pudo crear el acceso en este navegador.';
      }finally{
        submit.disabled=false;
        modes.forEach(button=>{button.disabled=false});
      }
    });
  }
  modes.forEach(button=>button.addEventListener('click',()=>showMode(button.dataset.planMode)));
  dialog.addEventListener('click',event=>{
    if(event.target.closest('[data-plan-cancel]'))dialog.close();
  });
  dialog.addEventListener('close',()=>{pendingPlanEdit=null;dialog.remove()},{once:true});
  showMode(existing?'login':'register');
  document.body.append(dialog);
  dialog.showModal();
}

function renderPlanHeader(){
  const title=app.querySelector('h1');
  if(!title)return;
  const header=document.createElement('div');
  header.className='plan-page-heading';
  const access=document.createElement('div');
  access.id='plan-edit-access';
  title.before(header);
  header.append(title,access);
  updatePlanAccess();
}

function updatePlanAccess(){
  const bar=app.querySelector('#plan-edit-access');
  if(bar)bar.innerHTML=planSession?`<span>${escapeHTML(planSession.name)} · ${planSession.age} años</span> <button type="button" class="route-refresh" data-plan-signout>Cerrar sesión de edición</button>`:
    `<button type="button" class="btn" data-plan-access>Registrarse o iniciar sesión</button>`;
  for(const field of app.querySelectorAll('#family-plan-form input, #family-plan-form textarea, #vault-note')){
    field.readOnly=!planSession;
  }
}

const homeStore='sicep.household.v1';
let household={people:[],pets:[]};
try{const saved=JSON.parse(localStorage.getItem(homeStore)||'{}');household={people:Array.isArray(saved.people)?saved.people:[],pets:Array.isArray(saved.pets)?saved.pets:[]}}catch{}
function householdTabs(active){
  const tabs=[['hogar','Hogar','hogar'],['suministros','Suministros','suministros'],['plan','Plan','guia'],['documentos','Documentos','documentos']];
  return `<nav class="plan-tabs" aria-label="Mi plan">${tabs.map(([key,title,glyph])=>
    `<a class="${active===key?'active':''}"${active===key?' aria-current="page"':''} href="#guia/${key}">${icon(glyph)}${title}</a>`).join('')}</nav>`;
}
function personCard(person,index){return `<article class="household-person"><div><h3>${escapeHTML(person.name)}</h3><p>${person.age?escapeHTML(person.age)+' años · ':''}${person.blood?`Sangre ${escapeHTML(person.blood)}`:''}</p>${person.allergies?`<p><b>Alergias:</b> ${escapeHTML(person.allergies)}</p>`:''}${person.medicines?`<p><b>Medicamentos:</b><br>${escapeHTML(person.medicines).replace(/\n/g,'<br>')}</p>`:''}${person.notes?`<p><b>Notas:</b> ${escapeHTML(person.notes)}</p>`:''}</div><button type="button" class="household-remove" data-remove-person="${index}" aria-label="Quitar a ${escapeHTML(person.name)}">Quitar</button></article>`}
function petCard(pet,index){return `<article class="household-person"><div><h3>${escapeHTML(pet.name)}</h3><p>${escapeHTML(pet.species)}${pet.weight?` · ${escapeHTML(pet.weight)} kg`:''}</p>${pet.notes?`<p><b>Notas:</b> ${escapeHTML(pet.notes)}</p>`:''}</div><button type="button" class="household-remove" data-remove-pet="${index}" aria-label="Quitar a ${escapeHTML(pet.name)}">Quitar</button></article>`}
function householdDialog(type){return type==='person'?`<dialog class="household-dialog" id="person-dialog"><form id="person-form"><h2>Agregar persona</h2><label>Nombre<input name="name" autocomplete="name" maxlength="100" placeholder="p. ej. Alex" required></label><div class="household-form-grid"><label>Edad<input name="age" type="number" min="0" max="120"></label><label>Tipo de sangre (opcional)<input name="blood" maxlength="8" placeholder="p. ej. O+"></label></div><label>Alergias<input name="allergies" maxlength="240" placeholder="p. ej. penicilina, maní"></label><label>Medicamentos (uno por línea)<textarea name="medicines" rows="3" maxlength="500" placeholder="p. ej. Insulina 10 u"></textarea></label><label>Notas (movilidad, condiciones)<input name="notes" maxlength="240" placeholder="p. ej. usa silla de ruedas"></label><div class="household-dialog-actions"><button type="button" class="household-cancel" data-close-dialog>Cancelar</button><button type="submit" class="household-save">Guardar</button></div></form></dialog>`:`<dialog class="household-dialog" id="pet-dialog"><form id="pet-form"><h2>Agregar mascota</h2><label>Nombre<input name="name" maxlength="100" required></label><div class="household-form-grid"><label>Especie<select name="species"><option>Perro</option><option>Gato</option><option>Ave</option><option>Otra</option></select></label><label>Peso (kg)<input name="weight" type="number" min="0" max="300" step="0.1"></label></div><label>Notas (medicamentos, microchip, veterinario)<textarea name="notes" rows="3" maxlength="300"></textarea></label><div class="household-dialog-actions"><button type="button" class="household-cancel" data-close-dialog>Cancelar</button><button type="submit" class="household-save">Guardar</button></div></form></dialog>`}
const supplyItems=[
['Agua: 1 galón (3.8 L) por persona al día, para 3 días o más','Guarde por lo menos un galón por persona al día para beber e higiene. Si tiene espacio, procure guardar para dos semanas.','required'],
['Alimentos no perecederos para 3 días o más','Elija alimentos que no necesiten refrigeración ni mucha preparación. Incluya un abrelatas manual.','required'],
['Radio de pilas o de manivela y pilas de repuesto','Permite escuchar avisos si falla el internet o la red celular.','required'],
['Linterna y baterías de repuesto','Considere una por persona. Evite usar velas: pueden provocar incendios.','required'],
['Botiquín de primeros auxilios','Incluya material básico para curaciones.','required'],['Silbato para pedir ayuda','Guárdelo junto con el equipo de salida.','required'],
['Mascarillas para polvo o N95','Pueden ayudar frente a partículas como ceniza o polvo; no sirven contra todos los gases.','required'],
['Artículos de higiene: toallitas, bolsas y amarres','Ayudan a mantener limpieza si se interrumpen servicios.','required'],
['Llave o pinzas para cerrar servicios','Ubique antes las llaves de agua y gas. Cierre el gas solo si huele a gas o las autoridades lo indican; no lo reabra sin revisión.','required'],
['Abrelatas manual','Necesario si guarda alimentos enlatados.','required'],['Mapas locales impresos','Anote rutas y puntos de reunión para consultarlos aunque el teléfono se quede sin batería.','required'],
['Cargador y batería externa para el teléfono','Mantenga cargada la batería externa.','required'],['Herramientas básicas: multiherramienta, cinta y tijeras','Guárdelas lejos del alcance de niñas y niños.','required'],
['Medicamentos recetados para 7 días o más','Consulte a su médico o farmacia cómo mantener una reserva segura y rótela antes de que caduque.','required'],
['Lentes de repuesto y solución para lentes de contacto','Incluya los artículos que cada integrante usa a diario.','optional'],['Efectivo en billetes pequeños','Los cajeros y lectores de tarjeta podrían no estar disponibles.','optional'],
['Copias de documentos importantes en bolsa impermeable','Considere identificaciones, contactos y recetas; proteja los originales.','optional'],['Sacos de dormir o cobijas abrigadoras','Ajuste la cantidad al clima y al hogar.','optional'],
['Muda completa de ropa y calzado resistente por persona','Guarde prendas cómodas adecuadas para la temporada.','optional'],
['Cloro doméstico líquido sin aroma','Solo use cloro con hipoclorito de sodio al 5–9% y siga indicaciones oficiales. Nunca lo mezcle con otros limpiadores.','optional'],
['Extintor de incendios','Revise fecha, presión e instrucciones del fabricante.','optional'],['Cerillos en recipiente impermeable','Manténgalos protegidos y lejos de fuentes de calor.','optional'],
['Higiene personal: jabón, cepillo, pasta y productos menstruales','Adapte la cantidad a las necesidades del hogar.','optional'],['Utensilios, platos y vasos','Prefiera artículos reutilizables si dispone de agua para lavarlos.','optional'],
['Papel, lápices y actividades para niñas y niños','Pueden ayudar a mantenerlos ocupados durante la espera.','optional'],['Libros, cartas o juegos','Incluya algo que ayude a pasar el tiempo y mantener el ánimo.','optional']
];
let suppliesChecked=[];try{const saved=JSON.parse(localStorage.getItem('sicep.supplies.v1')||'[]');if(Array.isArray(saved))suppliesChecked=saved.filter(i=>Number.isInteger(i)&&i>=0&&i<supplyItems.length)}catch{}
function supplies(){
  const people=household.people.length,pets=household.pets.length,petKg=household.pets.reduce((sum,p)=>sum+(Number(p.weight)||0),0),perDay=people+petKg*.0667/3.785,three=Math.ceil(perDay*3*10)/10,fourteen=Math.ceil(perDay*14*10)/10,calories=people*2000,checked=new Set(suppliesChecked);
  const items=supplyItems.map(([name,description,priority],i)=>`<div class="supply-item"><label><input type="checkbox" data-supply="${i}" ${checked.has(i)?'checked':''}><span class="supply-name">${name}</span><small class="supply-tag ${priority}">${priority==='required'?'Esencial':'Adicional'}</small></label><details><summary><span class="supply-open">Ver indicación</span><span class="supply-close">Cerrar indicaciones</span></summary><p>${description}</p></details></div>`).join('');
  return `<h1>Mi plan</h1>${householdTabs('suministros')}<section class="household-section supplies-overview"><h2>Sus suministros</h2><p class="household-intro">Comience por los artículos esenciales y marque cada uno a medida que lo consiga. Las cantidades de agua se ajustan a su hogar.</p><div class="supply-metrics"><article><span>Hogar</span><b>${people}</b><small>personas${pets?` · ${pets} ${pets===1?'mascota':'mascotas'}`:''}</small></article><article><span>Agua · 3 días</span><b>${three.toLocaleString('es-MX')}</b><small>galones aprox.</small></article><article><span>Agua · 2 semanas</span><b>${fourteen.toLocaleString('es-MX')}</b><small>galones aprox.</small></article><article><span>Calorías diarias</span><b>${calories.toLocaleString('es-MX')}</b><small>kcal aprox. para adultos</small></article></div>${people?'<p class="supplies-note">Referencia: 1 galón (3.8 L) por persona al día; se suma una estimación para mascotas con peso registrado.</p>':'<p class="supplies-empty">Agregue a las personas de su hogar en <a href="#guia/hogar">Hogar</a> para personalizar estas cantidades.</p>'}</section><section class="household-section supply-checklist"><h2>Lista de verificación</h2><p class="household-intro">Los artículos esenciales se señalan como tales. Abra “Ver indicación” para leer recomendaciones.</p><div class="supply-items">${items}</div><p class="supplies-progress" id="supplies-progress">${checked.size} de ${supplyItems.length} artículos marcados</p></section><section class="household-section supply-guidance"><h2>Calculadora de agua y alimentos</h2><p class="household-intro">Guarde agua y alimentos para varios días. Dos semanas dan más margen, si tiene dónde almacenarlos.</p><h3>Agua</h3><p>Planee 1 galón (3.8 L) por persona al día para beber e higiene. Guarde el agua en recipientes limpios aptos para alimentos y renuévela cada seis meses.</p><p>Considere agua adicional para mascotas, calor, lactancia o enfermedad. La estimación para mascotas es aproximada.</p><p>Si no cuenta con agua embotellada segura y las autoridades no advierten contaminación química, filtre primero el agua turbia. Hierva hasta hervor continuo por 1 minuto; a más de 2,000 m de altitud, por 3 minutos. Como alternativa, para agua clara use cloro líquido sin aroma con hipoclorito de sodio al 5–9%: 8 gotas por galón y espere 30 minutos. Si está turbia o muy fría, duplique la dosis. Esto no elimina combustibles, químicos ni material radiactivo; en esos casos no la consuma y siga indicaciones oficiales.</p><h3>Alimentos</h3><p>Como referencia general, calcule alrededor de 2,000 kcal por adulto al día; las necesidades de niñas y niños varían según su edad y actividad. Priorice alimentos que no requieran refrigeración, mucha agua ni preparación complicada.</p><p>Incluya opciones para alergias, dietas especiales, bebés y mascotas. Revise caducidades y consuma y reponga lo almacenado.</p><p class="supply-sources">Fuentes: <a href="https://www.ready.gov/es/kit" target="_blank" rel="noopener">Ready.gov · Kit de suministros</a> · <a href="https://www.cdc.gov/water-emergency/about/" target="_blank" rel="noopener">CDC · Agua segura en emergencias</a>.</p></section>`;
}
const planStore='sicep.plan.v1';
let familyPlan={contactName:'',contactPhone:'',contactAlt:'',localMeeting:'',regionalMeeting:'',notes:''};
try{familyPlan={...familyPlan,...JSON.parse(localStorage.getItem(planStore)||'{}')}}catch{}
function planPage(){return `<h1>Mi plan</h1>${householdTabs('plan')}<section class="household-section family-plan"><h2>Plan de comunicación</h2><p class="household-intro">El servicio de larga distancia suele restablecerse antes que el local. Elijan a una persona fuera de su región como contacto central y acuerden que todos se reporten con ella.</p><form id="family-plan-form"><h3>Contacto fuera del área</h3><div class="household-form-grid"><label>Nombre<input name="contactName" maxlength="120" value="${escapeHTML(familyPlan.contactName)}" placeholder="p. ej. Tía Kim en Monterrey"></label><label>Teléfono<input name="contactPhone" type="tel" maxlength="40" value="${escapeHTML(familyPlan.contactPhone)}" placeholder="+52 222 555 0100"></label></div><label>Correo / alternativo<input name="contactAlt" maxlength="150" value="${escapeHTML(familyPlan.contactAlt)}" placeholder="opcional"></label><h3>Puntos de reunión</h3><p>Si la casa no es segura, ¿dónde se encuentran? Elijan uno cerca y otro más lejos.</p><label>Punto de reunión local (cerca de casa)<input name="localMeeting" maxlength="200" value="${escapeHTML(familyPlan.localMeeting)}" placeholder="p. ej. patio delantero, buzón"></label><label>Punto de reunión regional (si se evacua el vecindario)<input name="regionalMeeting" maxlength="240" value="${escapeHTML(familyPlan.regionalMeeting)}" placeholder="p. ej. biblioteca en calle 10 y Principal, casa de la abuela"></label><label>Notas del plan (fechas de simulacros, rutinas)<textarea name="notes" rows="4" maxlength="1000">${escapeHTML(familyPlan.notes)}</textarea></label><div class="household-dialog-actions"><span id="plan-status" role="status">Guardado en este dispositivo.</span><button class="household-save" type="submit">Guardar plan</button></div></form><aside class="plan-advice"><b>Primero mensaje de texto, después llamada.</b> Los mensajes pueden pasar cuando las llamadas fallan. Acuerden una palabra clave que confirme que están a salvo.</aside><p class="household-privacy">El plan se guarda solo en este dispositivo.</p></section>`}
const documentItems=['Licencia de conducir / identificación oficial','Pasaporte','Seguro Social / tarjeta de identidad nacional','Acta de nacimiento','Acta de matrimonio / divorcio','Escrituras / contrato de arrendamiento','Título / registro del vehículo','Pólizas de seguro (hogar, auto, salud, vida)','Cartilla de vacunación','Expediente médico / lista de medicamentos','Vacunación de las mascotas','Contactos de emergencia','Números de cuenta y tarjetas (foto de frente y reverso)','Recibo de servicios reciente (comprobante de domicilio)','Fotos de objetos de valor (para reclamaciones de seguro)','Testamento / poder notarial'];
const vaultStore='sicep.documents.vault.v1';let vaultRecord=null,vaultKey=null,vaultData=null,vaultOpen=false,vaultMessage='';
try{vaultRecord=JSON.parse(localStorage.getItem(vaultStore)||'null')}catch{}
const toB64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromB64=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function deriveVaultKey(password,salt,iterations=600000){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function encryptVault(data,key,salt,iterations=600000){const iv=crypto.getRandomValues(new Uint8Array(12)),encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(data)));return{version:1,iterations,salt:toB64(salt),iv:toB64(iv),ciphertext:toB64(encrypted)}}
async function decryptVault(record,password){const salt=fromB64(record.salt),key=await deriveVaultKey(password,salt,record.iterations||310000),bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(record.iv)},key,fromB64(record.ciphertext));return{key,iterations:record.iterations||310000,data:JSON.parse(new TextDecoder().decode(bytes)),salt}}
async function saveVault(){if(!vaultKey||!vaultData||!vaultRecord)return false;try{const next=await encryptVault(vaultData,vaultKey,fromB64(vaultRecord.salt),vaultRecord.iterations||600000);localStorage.setItem(vaultStore,JSON.stringify(next));vaultRecord=next;const status=document.querySelector('#vault-status');if(status)status.textContent='Cambios guardados y cifrados en este dispositivo.';return true}catch{const status=document.querySelector('#vault-status');if(status)status.textContent='No se pudieron guardar los cambios; libera espacio e inténtalo de nuevo.';return false}}
function documentsPage(){
  const supported=Boolean(globalThis.crypto?.subtle),unlocked=supported&&vaultOpen&&vaultData;
  const warning='<aside class="vault-warning"><b>Importante:</b> Si olvidas la contraseña, la bóveda no se puede recuperar. No hay puerta trasera. Anótala y guárdala en un lugar físico seguro, separado de este dispositivo.</aside>';
  const security=`<p class="vault-security">Cifrada con AES-GCM (256 bits) + PBKDF2 (${(vaultRecord?.iterations||600000).toLocaleString('es-MX')} iteraciones). La contraseña nunca sale de este dispositivo.</p>`;
  let access;
  if(!supported)access='<p>Este navegador no permite el cifrado necesario. Usa una conexión segura (HTTPS) y un navegador actualizado.</p>';
  else if(unlocked)access=`<form id="vault-note-form"><label for="vault-note">Notas privadas (se guardan al bloquear)</label><textarea id="vault-note" name="note" rows="10" maxlength="10000">${escapeHTML(vaultData.note||'')}</textarea><div class="vault-actions"><button class="household-save" type="submit">Guardar y bloquear</button><button class="household-cancel" type="button" data-vault-lock>Bloquear sin guardar</button><button class="vault-destroy" type="button" data-vault-destroy>Destruir bóveda</button></div></form>`;
  else if(vaultRecord)access=`<form id="vault-open-form"><h3>Abrir bóveda</h3>${security}<label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label>${vaultMessage?`<p class="vault-error" role="alert">${escapeHTML(vaultMessage)}</p>`:''}<div class="vault-actions"><button class="household-save" type="submit">Desbloquear</button><button class="vault-destroy" type="button" data-vault-destroy>Destruir bóveda</button></div></form>`;
  else access=`<form id="vault-create-form"><h3>Crear bóveda</h3><label>Contraseña (8 caracteres o más)<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label>Confirmar contraseña<input name="confirm" type="password" minlength="8" autocomplete="new-password" required></label><label>Pista privada (opcional)<textarea name="hint" rows="2" maxlength="180" placeholder="No escribas la contraseña aquí"></textarea></label>${vaultMessage?`<p class="vault-error" role="alert">${escapeHTML(vaultMessage)}</p>`:''}<button class="household-save" type="submit">Crear bóveda</button></form>`;
  const checked=new Set(unlocked&&Array.isArray(vaultData.checked)?vaultData.checked:[]),custom=unlocked&&Array.isArray(vaultData.custom)?vaultData.custom:[],items=[...documentItems,...custom],list=items.map((name,i)=>`<label class="vault-item"><input type="checkbox" data-vault-item="${i}" ${checked.has(i)?'checked':''} ${unlocked?'':'disabled'}><span>${escapeHTML(name)}</span></label>`).join('');
  return `<h1>Mi plan</h1>${householdTabs('documentos')}<section class="household-section vault-panel"><h2>Bóveda de documentos</h2><p class="household-intro">Una bóveda privada de notas protegida con contraseña. Guarda datos de emergencia y referencias importantes. La información se cifra en este navegador y no sale del dispositivo.</p>${warning}${unlocked&&vaultData.hint?`<p class="vault-hint"><b>Tu pista:</b> ${escapeHTML(vaultData.hint)}</p>`:''}${access}</section><section class="household-section document-list"><h2>Lista de documentos</h2><p class="household-intro">Ten copias en un lugar seguro: en una bolsa impermeable o con una persona de confianza.</p><div class="vault-list">${list}</div>${unlocked?`<form id="vault-custom-form" class="vault-custom-form"><label for="vault-custom">Agregar documento a la lista</label><div><input id="vault-custom" name="name" maxlength="120" placeholder="Agregue el suyo..." required><button class="household-cancel" type="submit">Agregar</button></div></form><p id="vault-status" class="household-privacy" role="status">Cambios cifrados al guardar.</p>`:supported?'<p class="vault-locked-note">Desbloquea la bóveda para marcar o añadir documentos.</p>':''}</section>`;
}
function preparation(section='hogar'){
  const tab=['hogar','suministros','plan','documentos'].includes(section)?section:'hogar';
  if(tab==='suministros')return supplies();
  if(tab==='plan')return planPage();
  if(tab==='documentos')return documentsPage();
  if(tab!=='hogar')return `<h1>Mi plan</h1>${householdTabs(tab)}<section class="household-section household-coming"><h2>${tab==='suministros'?'Suministros':tab==='plan'?'Plan':'Documentos'}</h2><p>Esta sección está lista para completar. Pronto podrás agregar aquí la información de ${tab==='suministros'?'los suministros de tu hogar':tab==='plan'?'tu plan familiar':'tus documentos importantes'}.</p></section>`;
  return `<small class="kicker">Preparación familiar</small><h1>Mi plan</h1>${householdTabs(tab)}<section class="household-section"><h2>Hogar</h2><p class="household-intro">Agrega a las personas que viven contigo. Esta información ayuda a preparar un plan que considere lo que necesita cada integrante.</p>${household.people.length?`<div class="household-list">${household.people.map(personCard).join('')}</div>`:'<p class="household-empty">Aún no hay personas agregadas.</p>'}<button type="button" class="household-add" data-add-person>＋ Agregar persona</button></section><section class="household-section"><h2>Mascotas</h2><p class="household-intro">Inclúyelas para tener presentes su alimento, agua, transportadora y cuidados.</p>${household.pets.length?`<div class="household-list">${household.pets.map(petCard).join('')}</div>`:'<p class="household-empty">Aún no hay mascotas agregadas.</p>'}<button type="button" class="household-add" data-add-pet>＋ Agregar mascota</button></section>${householdDialog('person')}${householdDialog('pet')}`;
}
const planTopics = [
  ['lluvias','⛈','Lluvia intensa e inundaciones'],
  ['sismos','⌂','Plan Sismo Puebla'],
  ['incendios','♨','Contingencias de incendios'],
  ['invierno','❄','Emergencias de temporada invernal'],
  ['volcan','△','Plan Popocatépetl'],
  ['peregrinaciones','♧','Protección y seguridad en peregrinaciones'],
  ['pirotecnia','✧','Programa especial de pirotecnia']
];
function volcanoPlan(){
  return `<div class="guidance-back">${back('inicio','Inicio')}</div><small class="kicker">Programa Especial para Contingencias</small><h1>Plan Popocatépetl</h1>
  <p class="guidance-intro">Qué significan los peligros del volcán y cómo preparar a tu hogar antes de una contingencia.</p>
  <section class="volcano-dashboard" aria-labelledby="volcano-dashboard-title"><div class="volcano-dashboard-head"><div><small>Referencia visual del ejercicio</small><h2 id="volcano-dashboard-title">Semáforo y dirección del viento</h2></div></div><div class="volcano-dashboard-grid"><section class="volcano-indicator"><h3>Semáforo de alerta volcánica</h3><strong class="volcano-level">AMARILLO · FASE 2</strong><div class="traffic-light" role="img" aria-label="Ejemplo visual: amarillo, fase 2"><span class="traffic-lamp traffic-green"></span><span class="traffic-lamp traffic-yellow active"></span><span class="traffic-lamp traffic-red"></span></div><p class="volcano-indicator-note">El color mostrado es ilustrativo; consulta los avisos de tu localidad para conocer el nivel vigente.</p></section><section class="volcano-indicator wind-indicator"><h3>Dirección del viento</h3><strong class="wind-direction">ESTE</strong><div class="compass" role="img" aria-label="Ejemplo de brújula señalando al Este"><span class="compass-n">N</span><span class="compass-e">E</span><span class="compass-s">S</span><span class="compass-w">O</span><span class="compass-arrow">➤</span></div><p class="volcano-indicator-note">La dirección puede cambiar; este gráfico no es una medición meteorológica en tiempo real.</p></section></div></section>
  <aside class="guidance-lead volcano-lead"><b>Lo más importante</b><p>Ten listo tu plan familiar y conoce tu punto de reunión. Si las autoridades ordenan evacuar, sal por el punto, la ruta y el transporte indicados para tu comunidad.</p></aside>
  <div class="guidance-grid volcano-guide-grid">
    <section class="guidance-card"><small>Peligros volcánicos</small><h2>Qué puede ocurrir</h2><ul><li><b>Caída de ceniza:</b> puede afectar la respiración, contaminar agua y alimentos y acumular peso en los techos.</li><li><b>Flujos piroclásticos:</b> mezclas muy calientes de gases y material volcánico que descienden rápidamente y son destructivas.</li><li><b>Lahares:</b> lodo, agua y escombro que pueden bajar por barrancas y cauces; la lluvia puede favorecer su formación.</li><li><b>Material expulsado:</b> fragmentos y rocas representan mayor peligro cerca del cráter.</li></ul></section>
    <section class="guidance-card"><small>Territorio</small><h2>El riesgo cambia según la zona</h2><p>El programa distingue zonas de peligro mayor, moderado y menor. También identifica comunidades expuestas a flujos de lodo; la topografía y los cauces pueden cambiar la clasificación de una localidad.</p><p>El documento registra, con datos de población del Censo 2020, 24 comunidades en zona de peligro mayor (56,394 habitantes), 7 comunidades con peligro de flujo de lodo (29,861) y 42 comunidades en zona de peligro moderado (73,522). Las cifras corresponden a categorías del plan y pueden superponerse.</p><p>Entre las localidades señaladas en peligro mayor están Santiago Xalitzintla, San Nicolás de los Ranchos, San Mateo Ozolco, San Pedro Atlixco y San Baltazar Atlimeyaya.</p></section>
    <section class="guidance-card"><small>Semáforo de alerta</small><h2>Cómo interpretar la preparación</h2><p>El plan describe acciones preventivas para <b>Amarillo Fase 3</b>: tener documentos a la mano, ubicar puntos de reunión y abordaje, preparar el hogar y mantenerse atento a las indicaciones de las autoridades.</p><p>El plan señala que esa fase de preparación no inicia por sí misma una evacuación. La <b>Alerta Roja Fase 1</b> se considera con base en los reportes y la evacuación se ordena por la autoridad competente.</p><p>No tomes el semáforo ilustrado arriba como aviso vigente. Atiende los mensajes oficiales y municipales.</p></section>
    <section class="guidance-card"><small>Antes de una contingencia</small><h2>Deja un plan familiar preparado</h2><ul><li>Acuerden cómo se comunicarán y un punto de encuentro dentro y fuera de la localidad.</li><li>Definan quién acompaña a niñas, personas mayores, personas con discapacidad y mascotas.</li><li>Identifiquen el punto de reunión, el abordaje del transporte y el refugio asignado a su comunidad.</li><li>Guarden documentos, medicamentos necesarios, agua y alimento para personas y animales.</li><li>Practiquen cómo cerrar gas y electricidad, siempre que hacerlo sea seguro.</li><li>Eviten rumores y compartan solo información confirmada por autoridades.</li></ul><div class="volcano-shortcuts"><a class="link" href="#guia/plan">Preparar plan familiar</a><a class="link" href="#guia/suministros">Revisar suministros</a><a class="link" href="#guia/documentos">Organizar documentos</a></div></section>
    <section class="guidance-card"><small>Si cae ceniza</small><h2>Cuida a las personas y a los animales</h2><ul><li>Permanece bajo techo y limita las actividades al aire libre.</li><li>Si necesitas salir, usa protección para nariz, boca y ojos; sigue las indicaciones de salud locales.</li><li>Cierra puertas y ventanas. Cubre depósitos de agua, comida y alimentos de mascotas.</li><li>Mantén a los animales bajo resguardo y con agua y alimento protegidos de la ceniza.</li><li>Evita que la ceniza llegue a coladeras, drenajes o cuerpos de agua.</li></ul></section>
    <section class="guidance-card"><small>Si se ordena evacuar</small><h2>Sal con calma y por la ruta asignada</h2><ul><li>Dirígete al punto de reunión indicado y aborda el transporte dispuesto para tu localidad.</li><li>Lleva identificación, medicamentos indispensables, agua y artículos esenciales; procura que las familias permanezcan juntas.</li><li>Sigue la ruta y las instrucciones de las autoridades. No improvises atajos ni regreses por objetos.</li><li>Ve al refugio que te indiquen y registra a las personas de tu hogar al llegar.</li><li>No vuelvas a la zona evacuada hasta que las autoridades permitan el regreso.</li></ul></section>
    <section class="guidance-card"><small>Lluvia y barrancas</small><h2>Aléjate de cauces y laderas</h2><p>Los lahares pueden desplazarse por barrancas, ríos y arroyos, incluso después de que empieza a llover lejos de tu comunidad. No cruces corrientes ni te acerques a cauces para observarlos. Si vives cerca de una barranca, conoce de antemano por dónde salir y atiende cualquier aviso local.</p></section>
    <section class="guidance-card"><small>Refugios temporales</small><h2>Qué esperar al llegar</h2><p>Los refugios se habilitan para recibir a la población evacuada y el programa contempla registrar a quienes llegan y coordinar la atención. Sigue las indicaciones del personal, informa si alguien necesita atención médica o apoyo de movilidad y pregunta dónde mantener reunida a tu familia.</p><p>La ubicación y apertura dependen de la contingencia y de las instrucciones de las autoridades; no todos los espacios están disponibles en todo momento.</p></section>
  </div>
  <p class="guidance-source">Fuente: <i>Programa Especial para Contingencias del Volcán Popocatépetl</i>, Gobierno del Estado de Puebla. Peligros y zonas: pp. 11–17; preparación y alertamiento: pp. 18–25; evacuación y refugios: pp. 35–39. Datos de población citados en el programa con base en el Censo INEGI 2020.</p>`;
}
function rainPlan(){
  return `<div class="guidance-back">${back('inicio','Inicio')}</div><small class="kicker">Programa Especial de Protección Civil · Lluvias y Ciclones Tropicales 2026</small><h1>Lluvia intensa e inundaciones</h1>
  <p class="guidance-intro">Prepárate para lluvias, inundaciones, vientos fuertes y deslaves. En Puebla, los ríos, barrancas y laderas elevan el riesgo en algunas localidades.</p>
  <aside class="guidance-lead"><b>Antes de que llueva, ubica un lugar alto, una ruta segura y el refugio temporal de tu municipio.</b><p>No cruces corrientes ni caminos inundados, aunque parezcan poco profundos. El nivel puede subir con rapidez.</p></aside>
  <div class="guidance-grid weather-guide-grid">
    <section class="guidance-card"><small>Riesgos de la temporada</small><h2>La lluvia puede causar más de una emergencia</h2><ul><li><b>Inundación pluvial:</b> el agua de lluvia se acumula en calles y zonas bajas cuando no alcanza a drenar.</li><li><b>Desbordamiento:</b> ríos, arroyos y barrancas pueden salir de su cauce.</li><li><b>Deslaves:</b> laderas y taludes pueden volverse inestables con lluvia intensa.</li><li><b>Viento y tormentas:</b> pueden derribar árboles, postes u objetos sueltos y producir descargas eléctricas.</li></ul><p>El programa ubica como más expuestas las viviendas cercanas a cauces, barrancas, taludes y laderas.</p></section>
    <section class="guidance-card"><small>Si se aproxima un ciclón</small><h2>Qué indican los colores de alerta</h2><div class="storm-alert-scale"><div><span class="storm-dot storm-blue"></span><b>Azul · mínimo</b><p>Mantente informado.</p></div><div><span class="storm-dot storm-green"></span><b>Verde · bajo</b><p>Protege puertas y ventanas; guarda documentos y objetos que pueda levantar el viento.</p></div><div><span class="storm-dot storm-yellow"></span><b>Amarillo · moderado</b><p>Ubica el refugio y prepara agua y alimentos.</p></div><div><span class="storm-dot storm-orange"></span><b>Naranja · alto</b><p>Aléjate de las zonas de riesgo y atiende instrucciones de evacuación.</p></div><div><span class="storm-dot storm-red"></span><b>Rojo · máximo</b><p>Resguárdate en un lugar seguro, lejos de puertas y ventanas.</p></div></div><p class="storm-alert-note">El semáforo se comunica conforme evoluciona el ciclón; sigue los avisos de tu localidad.</p></section>
    <section class="guidance-card"><small>Antes de la lluvia</small><h2>Deja listo lo necesario</h2><ul><li>Limpia azoteas, desagües y coladeras con anticipación y solo si es seguro.</li><li>Guarda macetas, herramientas, botes y otros objetos que el viento pueda mover.</li><li>Empaca documentos en una bolsa impermeable y en una mochila que te deje las manos libres.</li><li>Ten agua potable, radio y lámpara con pilas y un botiquín.</li><li>Ubica el refugio y acuerda con tu familia cómo llegar y dónde reunirse.</li><li>Prepara un lugar protegido para tus animales.</li></ul><div class="volcano-shortcuts"><a class="link" href="#guia/suministros">Revisar suministros</a><a class="link" href="#guia/plan">Preparar plan familiar</a><a class="link" href="#guia/documentos">Organizar documentos</a></div></section>
    <section class="guidance-card"><small>Durante una inundación</small><h2>Aléjate de corrientes y zonas bajas</h2><ul><li>No camines, conduzcas ni intentes cruzar corrientes, ríos, arroyos o puentes cubiertos por agua.</li><li>Aléjate de barrancas, cauces y caminos inundados; no te acerques para mirar o grabar.</li><li>Evita tocar o pisar cables eléctricos. Mantente lejos de árboles y postes que puedan caer.</li><li>Si el agua se aproxima a tu vivienda o te indican evacuar, dirígete al lugar alto o refugio señalado.</li><li>Aléjate de casas y laderas que presenten peligro de deslave o derrumbe.</li></ul></section>
    <section class="guidance-card"><small>Si hay vientos fuertes</small><h2>Resguárdate y asegura el entorno</h2><ul><li>Permanece dentro de una construcción segura y lejos de ventanas.</li><li>No te refugies bajo árboles, anuncios, postes ni estructuras inestables.</li><li>No salgas a recoger objetos mientras el viento está fuerte.</li><li>Si hay cables caídos o árboles en riesgo, mantén distancia y avisa a las autoridades locales.</li></ul></section>
    <section class="guidance-card"><small>Después de la lluvia</small><h2>Espera antes de volver a zonas afectadas</h2><ul><li>Mantente alejado de caminos, viviendas, árboles y postes dañados.</li><li>No toques cables sueltos ni pises agua cerca de instalaciones eléctricas.</li><li>Si tu casa está junto a una ladera, no regreses mientras persista el peligro de deslave.</li><li>Informa sobre daños o caminos bloqueados a las autoridades de tu localidad.</li><li>El refugio y la zona afectada deben dejarse cuando las autoridades indiquen que es seguro.</li></ul></section>
    <section class="guidance-card"><small>Refugios temporales</small><h2>Prepárate para una estancia segura</h2><p>El programa contempla refugios con servicios básicos, atención de salud y alimentación, registro de las personas albergadas y apoyo para quienes necesitan ayuda de movilidad.</p><p>El documento 2026 reporta 811 refugios para una capacidad total de 151,084 personas en el estado. La apertura y el cupo disponible dependen de cada emergencia; dirígete al espacio que indique tu municipio.</p></section>
  </div>
  <p class="guidance-source">Fuentes: <i>Programa Especial de Protección Civil para la Temporada de Lluvias y Ciclones Tropicales 2026</i>, Gobierno del Estado de Puebla, significado de alertas p. 8; prevención y preparación pp. 34–38; medidas durante las lluvias pp. 43–44; refugios pp. 45–46.</p>`;
}
function earthquakePlan(){
  return `<div class="guidance-back">${back('inicio','Inicio')}</div><small class="kicker">Programa Especial de Protección Civil · Plan Sismo Puebla</small><h1>Sismos</h1>
  <p class="guidance-intro">Prepara tu casa y acuerda con tu familia dónde protegerse, cómo reunirse y qué revisar después de un sismo.</p>
  <aside class="guidance-lead"><b>La alerta sísmica no se activa para todos los sismos.</b><p>Según el Plan Sismo Puebla, puede no sonar ante sismos menores o con epicentro fuera de la cobertura de los sensores. Si no se escucha, actúa de acuerdo con el movimiento que percibas y el plan de tu inmueble.</p></aside>
  <div class="guidance-grid quake-guide-grid">
    <section class="guidance-card"><small>Puebla</small><h2>El nivel de riesgo varía por región</h2><p>El plan identifica zonas de riesgo alto, medio y bajo. En la clasificación del documento, entre las localidades en zona alta se encuentran Puebla capital, Tehuacán, Acatlán e Izúcar de Matamoros; en zona media, Cholula, Atlixco, San Martín Texmelucan y Ciudad Serdán. La Sierra Norte y Nororiental, incluidas Cuetzalan, Teziutlán y Zacatlán, aparecen en la zona baja.</p><p>La categoría es regional y no determina por sí sola la seguridad de un edificio. La construcción, el suelo y el estado del inmueble también influyen.</p></section>
    <section class="guidance-card"><small>Antes</small><h2>Prepara tu casa y a tu familia</h2><ul><li>Identifica zonas de menor riesgo dentro y fuera de la vivienda y acuerda un punto de reunión.</li><li>Asegura libreros, estantes, televisores y objetos que puedan caer; deja libres las rutas de salida.</li><li>Ubica tanques de gas, tomas eléctricas y sustancias inflamables.</li><li>Acuerden quién apoya a niñas y niños, personas mayores, personas con discapacidad y mascotas.</li><li>Ten a la mano números de emergencia, botiquín, radio y lámpara con pilas y documentos importantes.</li><li>Practiquen un simulacro y ajusten el plan si encuentran obstáculos.</li></ul><div class="volcano-shortcuts"><a class="link" href="#guia/plan">Preparar plan familiar</a><a class="link" href="#guia/suministros">Revisar suministros</a><a class="link" href="#guia/documentos">Organizar documentos</a></div></section>
    <section class="guidance-card"><small>Durante el movimiento</small><h2>Protégete en el lugar más seguro</h2><ul><li>Mantén la calma y dirígete a la zona de menor riesgo que identificaste.</li><li>Protege la cabeza y el cuello con los brazos; aléjate de ventanas, vidrios y objetos que puedan caer.</li><li>No uses elevadores ni escaleras mientras esté temblando.</li><li>Si estás en un edificio, sigue el protocolo del lugar y espera a que termine el movimiento antes de evacuar.</li><li>Si estás en la calle, aléjate de fachadas, postes, cables y objetos que puedan desprenderse.</li></ul></section>
    <section class="guidance-card"><small>Después</small><h2>Revisa daños antes de entrar</h2><ul><li>Verifica si alguien está herido y pide ayuda médica si hace falta.</li><li>Si el inmueble presenta daños, no lo uses ni vuelvas a entrar hasta que sea revisado.</li><li>No enciendas cerillos, velas ni aparatos eléctricos si sospechas una fuga de gas; aléjate y repórtala.</li><li>Mantente lejos de cables caídos y edificios dañados.</li><li>Prepárate para réplicas; pueden causar daños adicionales.</li><li>Si quedas atrapado, conserva la calma y golpea una superficie u objeto para que puedan localizarte.</li></ul></section>
    <section class="guidance-card"><small>Alerta sísmica</small><h2>Úsala como tiempo para actuar</h2><p>SASMEX usa sensores para detectar sismos fuertes en las regiones que cubre y emitir una señal de advertencia. No detecta todos los sismos: el propio plan indica que no se activa ante movimientos menores o con origen fuera de cobertura.</p><p>Cuando escuches la alerta, inicia el procedimiento que ya practicaste. No esperes la señal para protegerte si el movimiento ya comenzó.</p></section>
    <section class="guidance-card"><small>Práctica familiar</small><h2>Haz un simulacro y revisa el plan</h2><p>Asignen responsabilidades, practiquen llegar a las zonas seguras y reunirse en el punto acordado. Al terminar, revisen cuánto tardaron, si las salidas estaban libres y si todos sabían qué hacer.</p><p>Si la vivienda tiene daños visibles o materiales frágiles, solicita una revisión profesional antes de hacer reparaciones estructurales.</p></section>
  </div>
  <p class="guidance-source">Fuente: <i>Programa Especial de Protección Civil “Plan Sismo Puebla”</i>, Gobierno del Estado de Puebla. SASMEX y regionalización sísmica: pp. 16–19; plan familiar y recomendaciones antes, durante y después: pp. 35–38. Datos regionales de población citados en el documento con base en el Censo INEGI 2020.</p>`;
}
function plans(id){
  const plan = planTopics.find(topic=>topic[0]===id);
  if(id==='volcan')return volcanoPlan();
  if(id==='lluvias')return rainPlan();
  if(id==='sismos')return earthquakePlan();
  if(plan)return `${back('planes','Planes de Protección Civil')}<span class="icon" aria-hidden="true">${plan[1]}</span><h1>${plan[2]}</h1><section class="card"><p>Documento oficial pendiente de incorporar.</p><a class="link" href="#guia">Abrir mi plan de emergencia</a></section>`;
  const illustrated=planTopics.filter(([key])=>Object.hasOwn(planArtwork,key));
  const remaining=planTopics.filter(([key])=>!Object.hasOwn(planArtwork,key));
  return `${back()}<h1>Planes de Protección Civil</h1>
    <div class="plan-illustrations">${illustrated.map(([key,,title])=>`<a class="plan-illustration" href="#planes/${key}">
      <img src="assets/${planArtwork[key].image}" alt="" loading="lazy">
      <span><span class="icon">${icon(planArtwork[key].icon)}</span><strong>${title}</strong></span>
    </a>`).join('')}</div>
    <div class="tiles">${remaining.map(([key,,title])=>`<a class="tile" href="#planes/${key}"><span class="icon">${icon('guia')}</span><b>${title}</b></a>`).join('')}</div>`;
}
const contactSources={
  health:['Servicios de Salud de Puebla','https://ss.puebla.gob.mx/emergencias'],
  civil:['Protección Civil Puebla','https://proteccioncivil.puebla.gob.mx/'],
  roads:['SICT','https://www.gob.mx/sict/prensa/activa-sict-campana-de-seguridad-en-carreteras-federales'],
  tourism:['Ángeles Verdes','https://www.gob.mx/sectur/angelesverdes/es/articulos/como-identificar-a-los-vehiculos-de-los-angeles-verdes-en-carretera-409417'],
  security:['Seguridad Pública de Puebla','https://ssp.puebla.gob.mx/noticiasb/fortalece-ssp-acciones-para-combatir-fraude-digital-secuestro-virtual-y-extorsion'],
};
const contactLogos={
  'Protección Civil Estatal':['contacto-puebla.png','Gobierno del Estado de Puebla'],
  'SUMA Puebla':['contacto-suma.jpg','SUMA Puebla'],
  'Denuncia anónima':['contacto-089.png','089 Denuncia Anónima'],
  CAPUFE:['contacto-capufe.png','CAPUFE'],
  'Guardia Nacional':['contacto-guardia-nacional.png','Guardia Nacional'],
  'Ángeles Verdes':['contacto-angeles-verdes.png','Ángeles Verdes'],
};
function contactIdentity(name,source){
  const logo=contactLogos[name];
  if(logo)return `<img class="contact-brand-logo" src="assets/${logo[0]}" alt="${logo[1]===name?'':logo[1]}" loading="lazy">`;
  return `<span class="icon">${icon(source==='health'?'ambulancia':'contactos')}</span>`;
}
const contactGroups=[
  ['Atención en Puebla',[
    ['Protección Civil Estatal','Orientación y contacto institucional.',['222 246 27 50'],'civil'],
    ['Denuncia anónima','Información para denunciar delitos de forma anónima.',['089'],'security'],
    ['SUMA Puebla','Contacto del Servicio de Urgencias Médicas Avanzadas.',['222 232 8080','222 232 8081','222 232 8082'],'health'],
  ]],
  ['Asistencia en carretera',[
    ['CAPUFE','Auxilio en autopistas operadas por CAPUFE.',['074'],'roads'],
    ['Guardia Nacional','Atención en carreteras federales.',['088'],'roads'],
    ['Ángeles Verdes','Auxilio mecánico y orientación en carretera.',['078'],'tourism'],
  ]],
];

function contacts(){
  return `${back()}<div class="contacts-heading"><h1>Contactos de emergencia</h1></div>
    <section class="card contact-urgent" aria-labelledby="contact-911-title">
      <div class="contact-urgent-intro"><span class="icon">${icon('ambulancia')}</span><div><h2 id="contact-911-title">Emergencias · 911</h2><p>Llama para solicitar Policía, Bomberos o una ambulancia.</p></div></div>
      <a class="btn" href="tel:911">${icon('contactos')} Llamar al 911</a>
    </section>
    ${contactGroups.map(([title,contacts],index)=>`<section class="contact-additional" aria-labelledby="contact-group-${index}">
      <div class="contact-group-heading">
        <h2 id="contact-group-${index}">${title}</h2>
        <div class="contact-navigation" role="group" aria-label="Recorrer ${title}">
          <button type="button" data-contact-scroll="-1" aria-label="Contacto anterior" aria-controls="contact-track-${index}">‹</button>
          <button type="button" data-contact-scroll="1" aria-label="Siguiente contacto" aria-controls="contact-track-${index}">›</button>
        </div>
      </div>
      <div class="contact-track" id="contact-track-${index}" role="region" aria-labelledby="contact-group-${index}" tabindex="0">
      ${contacts.map(([name,description,numbers,source])=>`<article class="contact-extra contact-directory-card">
        <div class="contact-directory-title"><div class="contact-directory-brand">${contactIdentity(name,source)}</div><h3>${name}</h3></div>
        <p class="contact-directory-description">${description}</p>
        <div class="contact-directory-numbers">${numbers.map(number=>`<a href="tel:${number.replaceAll(' ','')}" aria-label="Llamar a ${name}, ${number}">${number}</a>`).join('')}</div>
        <a class="contact-directory-source" href="${contactSources[source][1]}" target="_blank" rel="noopener noreferrer">Fuente: ${contactSources[source][0]}</a>
      </article>`).join('')}</div></section>`).join('')}`;
}
// Coordenadas de las cabeceras. El último campo es la clave geoestadística de localidad del INEGI.
const riskZones=[
  ["Huauchinango", 20.1746978, -98.05134, "210710001"],
  ["Xicotepec", 20.2760586, -97.9581436, "211970001"],
  ["Zacatlán", 19.932365, -97.9602444, "212080001"],
  ["Chignahuapan", 19.8382233, -98.0309753, "210530001"],
  ["Tetela de Ocampo", 19.8167581, -97.8059722, "211720001"],
  ["Cuetzalan", 20.0185203, -97.5207706, "210430001"],
  ["Teziutlán", 19.8179906, -97.3608775, "211740001"],
  ["Atempan", 19.8399, -97.4592786, "210170001"],
  ["Tlatlauquitepec", 19.8513197, -97.4965919, "211860001"],
  ["San Martín Texmelucan", 19.2829081, -98.4355156, "211320001"],
  ["Huejotzingo", 19.1590081, -98.4080331, "210740001"],
  ["San Pedro Cholula", 19.0624842, -98.3075058, "211400001"],
  ["Puebla", 19.0439897, -98.1974947, "211140001"],
  ["Amozoc", 19.0446128, -98.0449169, "210150001"],
  ["Tepeaca", 18.9661328, -97.9054344, "211640001"],
  ["Atlixco", 18.9088483, -98.4341675, "210190001"],
  ["Tianguismanalco", 18.9777589, -98.4482192, "211750001"],
  ["Tochimilco", 18.8929244, -98.5721661, "211880001"],
  ["San Nicolás de los Ranchos", 19.0725892, -98.4856969, "211380001"],
  ["Izúcar de Matamoros", 18.6022311, -98.4654064, "210850001"],
  ["Tehuacán", 18.4621844, -97.3919989, "211560001"],
];
let riskMapInstance=null;
let riskMapView=null;
let monitoringRequest;
const volcanoReport='https://www.cenapred.gob.mx/reportesVolcanesMX/Procesos?tipoProceso=detallesUltimoReporteVolcan';
const seismicPlan='https://proteccioncivil.puebla.gob.mx/images/site/planes/PROGRAMAESPECIAL-EMERGENCIASSISMICAS.pdf';
// Plan Sismo Puebla, anexo 1, tablas de las páginas 29, 30, 32 y 34.
const seismicRiskLevels={
  alto:new Set([3, 5, 7, 9, 10, 11, 12, 13, 15, 18, 20, 21, 22, 23, 24, 27, 31, 32, 33, 35, 36, 37, 40, 42, 45, 46, 47, 51, 52, 55, 56, 59, 61, 62, 63, 65, 66, 69, 70, 73, 79, 81, 82, 85, 87, 92, 95, 97, 98, 99, 103, 106, 110, 112, 113, 114, 115, 118, 120, 121, 124, 127, 128, 129, 130, 131, 133, 135, 137, 139, 141, 142, 144, 145, 146, 147, 149, 150, 151, 152, 153, 154, 155, 156, 157, 159, 160, 161, 164, 165, 166, 168, 169, 171, 176, 177, 179, 182, 185, 189, 190, 191, 193, 195, 196, 198, 201, 203, 205, 206, 209, 214, 217]),
  medio:new Set([1, 4, 16, 17, 19, 26, 34, 38, 41, 44, 48, 50, 53, 54, 58, 60, 67, 74, 83, 90, 93, 94, 96, 102, 104, 105, 108, 116, 117, 119, 122, 125, 126, 132, 134, 136, 138, 140, 143, 148, 163, 170, 172, 173, 175, 180, 181, 186, 188, 199, 200, 211, 212]),
  bajo:new Set([2, 6, 8, 14, 25, 28, 29, 30, 39, 43, 49, 57, 64, 68, 71, 72, 75, 76, 77, 78, 80, 84, 86, 88, 89, 91, 100, 101, 107, 109, 111, 123, 158, 162, 167, 174, 178, 183, 184, 187, 192, 194, 197, 202, 204, 207, 208, 210, 213, 215, 216]),
};
function municipalSeismicRisk(){
  const code=Number(ruralMunicipalityCode.slice(-3));
  return Object.keys(seismicRiskLevels).find(level=>seismicRiskLevels[level].has(code));
}
const activeRiskZone=()=>ruralLocality();
const forecastLocation=()=>activeRiskZone()||ruralMunicipality()?.[2][0];
const ruralMapPoints=()=>ruralMunicipality()?.[2]||[];
function centerRuralMap(map){
  const points=ruralMapPoints();
  if(hazardLayer==='volcano')map.setView([19.023,-98.622],10);
  else if(activeRiskZone()){
    const [,,lat,lon]=activeRiskZone();
    map.setView([lat,lon],12);
  }else{
    const bounds=points.length?points.map(([,,lat,lon])=>[lat,lon]):riskZones.map(([,lat,lon])=>[lat,lon]);
    map.fitBounds(bounds,{padding:[28,28],maxZoom:11});
  }
}
const pueblaTime=new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'});

function initializeRiskMap(){
  const container=document.querySelector('#risk-map');
  if(!window.L){
    container.hidden=true;
    document.querySelector('#risk-map-status').textContent='El mapa base no está disponible. Los datos se muestran debajo.';
  }else{
    riskMapInstance=L.map(container,{scrollWheelZoom:false});
    if(riskMapView)riskMapInstance.setView(riskMapView.center,riskMapView.zoom);
    else centerRuralMap(riskMapInstance);
    const status=document.querySelector('#risk-map-status');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).on('tileerror',()=>{status.textContent='Algunas teselas del mapa base no cargaron.'}).addTo(riskMapInstance);
    if(hazardLayer==='volcano')L.marker([19.023,-98.622],{title:'Popocatépetl'}).addTo(riskMapInstance).bindTooltip('Popocatépetl');
    for(const [geoKey,name,lat,lon] of ruralMapPoints()){
      const selected=geoKey===ruralLocalityCode;
      const size=selected?27:19;
      const marker=L.marker([lat,lon],{
        title:name, zIndexOffset:selected?250:-100,
        icon:L.divIcon({className:'monitoring-place-icon',iconSize:[size,size],iconAnchor:[size/2,size/2],
          html:`<span class="monitoring-place-dot${selected?' is-selected':''}" aria-hidden="true"></span>`}),
      }).addTo(riskMapInstance).bindTooltip(document.createTextNode(name),{direction:'top'});
      marker.getElement()?.setAttribute('aria-label',name);
      marker.getElement()?.setAttribute('data-inegi',geoKey);
      marker.on('click',()=>{
        if(hazardLayer==='rain')selectRuralLocation(ruralMunicipalityCode,geoKey);
        else marker.openTooltip();
      });
    }
  }
  if(hazardLayer==='rain'&&forecastLocation())loadMonitoringData();
}

function selectRuralLocation(municipalityCode,localityCode=''){
  ruralMunicipalityCode=municipalityCode;
  ruralLocalityCode=localityCode;
  const supportedTown=ruralRouteTown();
  if(supportedTown>=0&&supportedTown!==town)changeMunicipality(supportedTown);
  shelterMapId=null;
  zoom=1;
  riskMapInstance?.remove();
  riskMapInstance=null;
  riskMapView=null;
  render();
}

async function loadMonitoringData(){
  monitoringRequest?.abort();
  const request=new AbortController();
  monitoringRequest=request;
  const output=document.querySelector('#monitoring-data');
  const [,,lat,lon]=forecastLocation()||[];
  const timeout=setTimeout(()=>request.abort(),12000);
  try{
    const weatherParams=new URLSearchParams({latitude:lat,longitude:lon,
      daily:'precipitation_sum,precipitation_probability_max,temperature_2m_min,temperature_2m_max,wind_gusts_10m_max',
      hourly:'temperature_2m,precipitation_probability',current:'temperature_2m',forecast_days:'3',timezone:'America/Mexico_City'});
    const response=await fetch('https://api.open-meteo.com/v1/forecast?'+weatherParams,{signal:request.signal});
    if(!response.ok)throw Error('Fuente no disponible');
    const data=await response.json();
    if(!output.isConnected||monitoringRequest!==request)return;
    const daily=data.daily;
    if(!Array.isArray(daily?.time)||!daily.time.length)throw Error('Pronóstico no disponible');
    const forecastDay=new Intl.DateTimeFormat('es-MX',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
    const value=(number,unit)=>Number.isFinite(number)?number+' '+unit:'Sin dato';
    const hourly=data.hourly;
    const nextHours=(hourly?.time||[]).map((time,index)=>({time,index}))
      .filter(({time})=>typeof data.current?.time==='string'&&time>=data.current.time)
      .slice(0,6);
    output.innerHTML=`<h3 class="city-forecast-heading">Próximos tres días</h3>
    <ul class="monitoring-readings">${daily.time.map((day,index)=>{
      const probability=daily.precipitation_probability_max?.[index];
      return `<li>
      <strong><time datetime="${escapeHTML(day)}">${forecastDay.format(new Date(day+'T00:00:00Z'))}</time></strong>
      <span><b>${value(daily.precipitation_sum?.[index],'mm')}</b> precipitación</span>
      <span><b>${value(probability,'%')}</b> prob. máxima</span>
      <span>Mín. <b>${value(daily.temperature_2m_min?.[index],'°C')}</b> · máx. <b>${value(daily.temperature_2m_max?.[index],'°C')}</b></span>
      <span>Rachas de hasta <b>${value(daily.wind_gusts_10m_max?.[index],'km/h')}</b></span>
      ${Number.isFinite(probability)&&probability>=0&&probability<=100?`<meter class="city-rain-meter" min="0" max="100" value="${probability}" aria-hidden="true"></meter>`:''}</li>`;
    }).join('')}</ul>
      ${nextHours.length?`<details class="city-hourly"><summary>Pronóstico por hora · próximas ${nextHours.length} horas</summary>
        <ul class="monitoring-readings">${nextHours.map(({time,index})=>`<li><strong><time datetime="${escapeHTML(time)}">${escapeHTML(time.slice(11,16))}</time></strong>
          <span><b>${value(hourly.temperature_2m?.[index],'°C')}</b></span><span><b>${value(hourly.precipitation_probability?.[index],'%')}</b> de lluvia</span></li>`).join('')}</ul>
      </details>`:''}
      <p class="muted">Consultado el ${pueblaTime.format(new Date())} · hora de Puebla</p>`;
  }catch{
    if(output.isConnected&&monitoringRequest===request){
      output.textContent='No se pudieron cargar los datos. Puedes consultar la fuente o volver a intentar.';
    }
  }finally{clearTimeout(timeout)}
}

function volcanoReportSummary(){
  return `<div class="city-volcano-report">
    <div class="city-report-meta"><span class="city-volcano-phase"><span>Semáforo volcánico</span><strong>Amarillo · Fase 2</strong></span>
      <time datetime="2026-11-25T11:00:00-06:00">25 nov 2026 · 11:00 h de Puebla</time></div>
    <dl class="city-volcano-facts">
      <div><dt>Exhalaciones en 24 horas</dt><dd>24 de baja intensidad</dd></div>
      <div><dt>Visibilidad al emitir el reporte</dt><dd>Sin visibilidad por el tiempo meteorológico</dd></div>
      <div><dt>Trayectoria prevista si hay una emisión importante</dt><dd>Este-sureste (ESE)</dd></div>
    </dl>
    <p class="muted">Resumen del boletín fechado de CENAPRED. La fuente oficial publica las actualizaciones.</p>
  </div>`;
}

function seismicRiskSummary(){
  const level=municipalSeismicRisk();
  return `<div class="city-seismic-risk city-seismic-risk-${level||'unknown'}">
      <span>Nivel municipal</span><strong>${level?level[0].toUpperCase()+level.slice(1):'Sin clasificación disponible'}</strong>
    </div>
    <p class="muted">La clasificación ayuda a prepararse. No indica la probabilidad de un sismo en los próximos días.</p>
    <a class="link" href="#planes/sismos">Guía de preparación ante sismos</a>`;
}

const cityLayerGlyphs={
  volcano:'M3 26 11 13h7l11 13H3ZM14 14l2 4-3 5 2 3M15 10c-1-2 1-3 3-3s3-2 2-4M10 10 8 7',
  rain:'M8 18a5 5 0 1 1 1-10 7 7 0 0 1 13 2 4 4 0 1 1 2 8H8ZM11 22l-2 4m8-4-2 4m8-4-2 4',
  quake:'M3 18h26M5 18V7h7v11m8 0V8l7-2v12M8.5 10v2m15-1v2M16 18l-2 3 3 2-2 4m-6-6-2 2m16-2 2 2',
};

function cityLayerIcon(layer){
  return `<svg class="city-layer-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${cityLayerGlyphs[layer]}"/></svg>`;
}

function riskMap(){
  const tabs=[['volcano','Actividad volcánica','CENAPRED'],['rain','Lluvia','Open-Meteo'],['quake','Riesgo sísmico','Plan Sismo Puebla']];
  const current=forecastLocation();
  const cards={
    rain:[current?'Pronóstico de lluvia · '+current[1]:'Pronóstico de lluvia',current?(activeRiskZone()?'Pronóstico de tres días para la localidad seleccionada.':'Pronóstico de referencia para esta localidad. Usa el filtro o toca un punto del mapa para consultar otra.'):'El pronóstico se mostrará cuando esté disponible el catálogo de localidades.','https://open-meteo.com/en/docs','Consultar Open-Meteo'],
    quake:['Riesgo sísmico · '+ruralMunicipalityName(),'Clasificación del municipio según el Plan Sismo Puebla.',seismicPlan+'#page=28','Consultar regionalización oficial'],
    volcano:['Popocatépetl','Monitoreo del volcán y trayectoria prevista de una posible emisión.',volcanoReport,'Abrir el reporte oficial de CENAPRED'],
  };
  const [title,description,source,label]=cards[hazardLayer];
  return `${back()}<div class="map-heading city-heading"><div><h1>Mi localidad</h1><p>Consulta el pronóstico de lluvia, el riesgo sísmico y el reporte del Popocatépetl.</p></div></div>
    <div class="city-layer-controls" role="group" aria-label="Capas del mapa">${tabs.map(([key,name,provider])=>`
      <button type="button" class="city-layer-button" data-layer="${key}" aria-pressed="${hazardLayer===key}">
      ${cityLayerIcon(key)}<span class="city-layer-label"><span>${name}</span><small>${provider}</small></span></button>`).join('')}</div>
    <div class="city-controls">${ruralFilters()}</div>
    <div class="city-layout"><section class="city-map-panel" aria-label="Mapa y leyenda">
      <div id="risk-map" class="risk-map-shell" role="region" aria-label="Mapa de Puebla y alrededores"></div>
      <p id="risk-map-status" class="muted" role="status"></p>
      <div class="monitoring-map-key" aria-label="Leyenda del mapa">
        <span><i aria-hidden="true"></i> Localidades rurales del municipio · INEGI</span>
        ${hazardLayer==='volcano'?'<span>Pin azul: Popocatépetl</span>':''}
      </div>
      <p class="muted"><a class="link" href="https://www.inegi.org.mx/servicios/catalogounico/" target="_blank" rel="noopener noreferrer">Fuente de las localidades: INEGI</a></p>
      </section>
      <section class="city-data-panel monitoring-detail" aria-labelledby="risk-zone-title">
        <h2 id="risk-zone-title">${cityLayerIcon(hazardLayer)}${escapeHTML(title)}</h2><p>${description}</p>
          ${hazardLayer==='volcano'?volcanoReportSummary():hazardLayer==='quake'?seismicRiskSummary():!current?'':`<div id="monitoring-data" aria-live="polite">Consultando la fuente…</div><button type="button" class="city-update" data-refresh-monitoring>Actualizar datos</button>`}
          <a class="link" href="${source}" target="_blank" rel="noopener noreferrer">${label}</a>
      </section>
    </div>`;
}

function routesPage(){
  if(ruralRouteTown()===-1||ruralLocality())return `${back('refugios','Refugios temporales')}<h1>Rutas</h1>${ruralFilters()}
    <section class="card"><h2>Sin rutas registradas para ${escapeHTML(ruralScope())}</h2>
      <p>Consulta los refugios publicados y sus condiciones de acceso antes de salir.</p>
      <a class="link" href="#refugios">Consultar refugios</a></section>`;
  if(!routeOrigin)routeOrigin=[...townCenters[town]];
  const openDestinations=places.map((p,i)=>p[2]===town&&p[3]==='Abierto'?[p,i]:null).filter(Boolean);
  if(!openDestinations.some(([,i])=>i===routeDestination))routeDestination=openDestinations[0]?.[1]??null;
  const destinations=openDestinations.map(([p,i])=>'<option value="'+i+'" '+(i===routeDestination?'selected':'')+'>'+escapeHTML(p[0])+'</option>').join('');
  const list=numberedReportsForTown(town);
  const reportRows=list.length?list.map(({report:r,number})=>{
    const photo=r.photo||(r.hasPhoto&&roadMode==='compartido'?'/api/routes/photo/'+encodeURIComponent(r.id):'');
    const date=r.created?new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(new Date(r.created)):'Reciente';
    const place=Number.isFinite(Number(r.latitude??r.lat))?'Punto marcado en el mapa':'Sin ubicación';
    const status=r.impact==='blocked'?'No se puede pasar':r.impact==='partial'?'Paso difícil':'Paso posible';
    const severity={high:'Alta',medium:'Media',low:'Baja'}[r.severity]||'Media';
    return '<article class="road-report"><div><span class="road-tag">Reporte #'+number+'</span> <span class="road-tag">'+escapeHTML(hazardLabels[r.hazard]||'Reporte')+'</span> <span class="road-impact impact-'+escapeHTML(r.impact||'blocked')+'">'+status+'</span><h3>'+escapeHTML(place)+'</h3><small>'+escapeHTML(date)+' · Gravedad '+severity+' · Por confirmar</small>'+(r.note?'<p>'+escapeHTML(r.note)+'</p>':'')+'</div>'+(photo?'<a class="road-photo-link" href="'+escapeHTML(photo)+'" target="_blank" rel="noopener"><img class="road-photo" src="'+escapeHTML(photo)+'" alt="Foto adjunta al reporte" loading="lazy"></a>':'')+'</article>';
  }).join(''):'<p class="muted">Aún no hay reportes de '+escapeHTML(towns[town])+'.</p>';
  const reporting=routeMapMode==='report';
  return (profile==='brigada'?back():back('refugios','Refugios temporales'))+'<div class="map-heading"><div><h1>'+(reporting?'Reportar un problema':'Rutas')+'</h1></div>'+ruralFilters()+'</div>'+(routeNotice&&!reporting?'<p class="route-feedback" role="status">'+escapeHTML(routeNotice)+'</p>':'')+
  '<section class="route-section route-live '+(reporting?'route-reporting':'')+'">'+(reporting?'<div class="route-section-head"><div><small>'+escapeHTML(towns[town])+'</small><h2>Marca el lugar afectado</h2></div></div>':'<div class="route-section-head"><div><small>'+escapeHTML(towns[town])+'</small><h2>Cómo llegar</h2></div><label class="route-destination">Refugio<select id="route-destination" '+(routeDestination===null?'disabled':'')+'>'+destinations+'</select></label></div>')+
  (reporting?'<div class="route-map-tools"><button type="button" data-route-mode="origin">Cancelar reporte</button></div>':'<div class="route-map-tools"><button type="button" data-route-mode="origin" class="selected">Elegir salida</button><button type="button" data-route-mode="report">Reportar peligro</button><button type="button" class="route-location" data-route-location>Usar mi ubicación</button></div>')+
  '<p class="route-map-hint" id="route-map-hint">'+escapeHTML(reporting?'Toca el mapa para marcar el punto del problema.':'Toca el mapa para elegir tu punto de partida.')+'</p><div id="route-real-map" class="route-real-map" role="application" aria-label="Mapa de rutas"></div>'+
  (reporting?'':'<div class="route-map-legend"><span><i class="legend-fast"></i>Ruta sugerida</span><span><i class="legend-safer"></i>Menos reportes cerca</span><span><i class="legend-hazard"></i>Reporte</span><span><i class="legend-refuge"></i>Refugio</span></div><div class="route-route-cards" id="route-route-cards"><div class="route-loading">Buscando ruta…</div></div>')+'</section>'+ 
  (routeMapMode==='report'?'<section class="route-section route-report-panel"><div class="route-section-head"><div><small>Nuevo reporte</small><h2>¿Qué encontraste?</h2></div></div><p class="route-map-hint">Marca primero el punto en el mapa y completa los datos del problema.</p>'+
  '<form id="route-report-form" class="route-form"><p class="route-point-summary route-full" id="route-point-summary">'+(routeReportPoint?'Punto marcado en el mapa.':'Marca el punto en el mapa.')+'</p><label>Qué ocurre<select name="hazard" required>'+Object.entries(hazardLabels).map(([id,name])=>'<option value="'+id+'">'+name+'</option>').join('')+'</select></label><label>Gravedad<select name="severity"><option value="high">Alta</option><option value="medium" selected>Media</option><option value="low">Baja</option></select></label><label>¿Se puede pasar?<select name="impact"><option value="blocked" selected>No</option><option value="partial">Con dificultad</option><option value="passable">Sí, con precaución</option></select></label><label>Descripción <span class="muted">(opcional)</span><textarea name="note" maxlength="350" rows="3" placeholder="Cuéntanos qué viste"></textarea></label><label class="route-full">Foto <span class="muted">(opcional)</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label><small class="route-privacy">Reportes vecinales; confirma la situación antes de salir.</small><button type="submit" '+(!routeReportPoint?'disabled':'')+'>Enviar reporte</button><p class="route-form-status" role="status" aria-live="polite"></p></form></section>':'')+
  (reporting?'':'<section class="route-section"><div class="route-section-head"><div><small>Observaciones comunitarias</small><h2>Reportes de '+escapeHTML(towns[town])+'</h2></div><button type="button" class="route-refresh" data-refresh-routes>Actualizar</button></div><div class="road-report-list">'+reportRows+'</div></section>')+
  '';
}
function haversineMeters(a,b){const rad=x=>x*Math.PI/180,R=6371000,dLat=rad(b[0]-a[0]),dLon=rad(b[1]-a[1]),v=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(v))}
function distanceToRouteMeters(point,routePoints){
  if(!routePoints.length)return Infinity;
  if(routePoints.length===1)return haversineMeters(point,routePoints[0]);
  const rad=x=>x*Math.PI/180,latScale=111132,lonScale=111320*Math.cos(rad(point[0]));let nearest=Infinity;
  for(let i=1;i<routePoints.length;i++){
    const ax=(routePoints[i-1][1]-point[1])*lonScale,ay=(routePoints[i-1][0]-point[0])*latScale;
    const bx=(routePoints[i][1]-point[1])*lonScale,by=(routePoints[i][0]-point[0])*latScale,dx=bx-ax,dy=by-ay;
    const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
    nearest=Math.min(nearest,Math.hypot(ax+t*dx,ay+t*dy));
  }
  return nearest;
}
function assessRoute(route,reports){
  const pts=(route.geometry?.coordinates||[]).map(([lon,lat])=>[lat,lon]);
  let blocked=0,penalty=0,near=[];
  for(const report of reports){const lat=Number(report.latitude??report.lat),lon=Number(report.longitude??report.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    const distance=distanceToRouteMeters([lat,lon],pts);
    if(distance<100){near.push({...report,distance});const impact=report.impact||'blocked';if(impact==='blocked')blocked++;else if(impact==='partial')penalty+=Math.max(45,220-Number(report.severity==='high'?0:report.severity==='medium'?45:90));else penalty+=25}
  }
  return {...route,blocked,penalty,near,adjustedDuration:route.duration+penalty};
}
function formatDuration(seconds){const minutes=Math.max(1,Math.round(seconds/60));return minutes<60?minutes+' min':Math.floor(minutes/60)+' h '+minutes%60+' min'}
function showRouteResults(){
  const root=document.querySelector('#route-route-cards');if(!root)return;
  if(!routeResult){root.innerHTML='<div class="route-loading">Buscando ruta…</div>';return}
  if(routeResult.error){root.innerHTML='<div class="route-empty"><b>No encontramos una ruta ahora.</b><p>'+escapeHTML(routeResult.error)+' Intenta de nuevo en un momento.</p></div>';return}
  const safeRoutes=routeResult.routes.filter(r=>r.blocked===0).sort((a,b)=>a.adjustedDuration-b.adjustedDuration);
  if(!safeRoutes.length){root.innerHTML='<article class="route-result route-result-unavailable"><span class="route-result-label">No hay una ruta sugerida</span><p>Las rutas disponibles pasan cerca de un cierre reportado. Elige otro destino o revisa con Protección Civil.</p></article>';return}
  const primary=safeRoutes[0],other=safeRoutes[1]||null;
  const reportText=primary.near.length===0?'Sin reportes cerca.':primary.near.length===1?'1 reporte cerca.':primary.near.length+' reportes cerca.';
  root.innerHTML='<article class="route-result"><div class="route-result-heading"><div><span class="route-result-label">Ruta sugerida</span><p>'+reportText+'</p></div><div class="route-result-time">'+formatDuration(primary.adjustedDuration)+'</div></div><div class="route-result-distance">'+(primary.distance/1000).toFixed(1)+' km</div>'+
    (other?'<div class="route-result-alternative"><span>Otra opción</span><span>'+formatDuration(other.adjustedDuration)+' · '+(other.distance/1000).toFixed(1)+' km</span></div>':'')+'</article>';
}
async function calculateRoutes(){
  const requestId=++routeRequestId;routeResult=null;showRouteResults();
  if(routeDestination===null){routeResult={error:'No hay refugios abiertos disponibles en este municipio.'};showRouteResults();return}
  const destination=refugeCoordinates[town]?.[routeDestination]||townCenters[town],origin=routeOrigin||townCenters[town];
  const reports=roadReports.filter(r=>Number(r.town)===town);
  try{
    const request=async waypoints=>{const coords=[origin,...waypoints,destination].map(([lat,lon])=>lon+','+lat).join(';'),url='https://router.project-osrm.org/route/v1/driving/'+coords+'?alternatives=3&steps=true&overview=full&geometries=geojson',response=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('El servicio de calles no respondió.');const data=await response.json();return data.code==='Ok'?{routes:data.routes||[],waypoints:data.waypoints||[]}:{routes:[],waypoints:[]}};
    const initial=await request([]);let candidates=initial.routes;if(!candidates.length)throw Error('No hay camino en la red vial para estos puntos.');
    let assessed=candidates.map(r=>assessRoute(r,reports));
    if(!assessed.some(r=>r.blocked===0)){
      const blocked=reports.filter(r=>(r.impact||'blocked')==='blocked').map(r=>({r,lat:Number(r.latitude??r.lat),lon:Number(r.longitude??r.lon)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(p=>({...p,distance:Math.min(...assessed.map(route=>distanceToRouteMeters([p.lat,p.lon],(route.geometry?.coordinates||[]).map(([lon,lat])=>[lat,lon]))))})).filter(p=>p.distance<650).sort((a,b)=>a.distance-b.distance).slice(0,6);
      if(blocked.length){
        const dx=(destination[1]-origin[1])*111320*Math.cos(origin[0]*Math.PI/180),dy=(destination[0]-origin[0])*111132,length=Math.hypot(dx,dy)||1,perp=[-dy/length,dx/length];
        const detours=await Promise.all([-1,1].map(async side=>{const waypoints=blocked.map(p=>[p.lat+side*220*perp[1]/111132,p.lon+side*220*perp[0]/(111320*Math.cos(p.lat*Math.PI/180))]);try{return (await request(waypoints)).routes}catch{return[]}}));
        candidates=[...candidates,...detours.flat()];assessed=candidates.map(r=>assessRoute(r,reports));
      }
    }
    if(requestId!==routeRequestId)return;
    routeResult={routes:assessed,snappedOrigin:initial.waypoints[0]?.location?[initial.waypoints[0].location[1],initial.waypoints[0].location[0]]:origin,snappedDestination:initial.waypoints[1]?.location?[initial.waypoints[1].location[1],initial.waypoints[1].location[0]]:destination};showRouteResults();paintRouteLayers();
  }catch(error){if(requestId!==routeRequestId)return;routeResult={error:error.name==='TimeoutError'?'El servicio de rutas tardó demasiado.':(error.message||'Servicio temporalmente no disponible.')};showRouteResults()}
}
function paintRouteLayers(){
  if(!routeMapInstance||!routeMapLayers)return;routeMapLayers.clearLayers();
  if(routeMapMode==='report'){if(routeReportPoint)L.circleMarker(routeReportPoint,{radius:11,color:'#fff',weight:3,fillColor:'#d9363e',fillOpacity:1}).bindPopup('Ubicación del reporte').addTo(routeMapLayers);return}
  const destination=refugeCoordinates[town]?.[routeDestination]||townCenters[town];
  const routeStart=routeResult?.snappedOrigin||routeOrigin,routeEnd=routeResult?.snappedDestination||destination;
  L.marker(routeEnd,{icon:L.divIcon({className:'route-marker refuge-marker',html:'<span>R</span>',iconSize:[34,34],iconAnchor:[17,17]})}).bindPopup('<b>'+escapeHTML(places[routeDestination]?.[0]||'Refugio')+'</b>').addTo(routeMapLayers);
  L.marker(routeStart,{icon:L.divIcon({className:'route-marker origin-marker',html:'<span>●</span>',iconSize:[28,28],iconAnchor:[14,14]})}).bindPopup('Salida · inicio ajustado a la calle más cercana').addTo(routeMapLayers);
  const numbered=numberedReportsForTown(town),reports=numbered.map(item=>item.report);
  numbered.forEach(({report,number})=>{const lat=Number(report.latitude??report.lat),lon=Number(report.longitude??report.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;const impact=report.impact||'blocked',tone=impact==='blocked'?'blocked':impact==='partial'?'partial':'passable';L.marker([lat,lon],{icon:L.divIcon({className:'route-hazard-icon '+tone,html:'<span>'+number+'</span>',iconSize:[34,34],iconAnchor:[17,17]})}).bindPopup('<b>Reporte #'+number+' · '+escapeHTML(hazardLabels[report.hazard]||'Reporte')+'</b><br>'+escapeHTML(impact==='blocked'?'No se puede pasar':impact==='partial'?'Paso difícil':'Paso posible')+'<br><small>Reporte vecinal · por confirmar</small>').addTo(routeMapLayers)})
  if(routeReportPoint)L.circleMarker(routeReportPoint,{radius:10,color:'#fff',weight:3,fillColor:'#d9363e',fillOpacity:1}).bindPopup('Punto del reporte').addTo(routeMapLayers);
  const all=routeResult?.routes||[],viable=all.filter(route=>route.blocked===0).sort((a,b)=>a.adjustedDuration-b.adjustedDuration);
  viable.forEach((route,index)=>{const latlngs=route.geometry.coordinates.map(([lon,lat])=>[lat,lon]);if(index===0)L.polyline(latlngs,{color:'#fff',weight:18,opacity:1,lineCap:'round',lineJoin:'round'}).addTo(routeMapLayers);L.polyline(latlngs,{color:index===0?'#075bd8':'#8492a6',weight:index===0?13:5,opacity:index===0?1:.58,dashArray:index===0?'':'8 9',lineCap:'round',lineJoin:'round'}).addTo(routeMapLayers)});
  const points=viable.flatMap(r=>r.geometry.coordinates.map(([lon,lat])=>[lat,lon]));if(!points.length)for(const report of reports){const lat=Number(report.latitude??report.lat),lon=Number(report.longitude??report.lon);if(Number.isFinite(lat)&&Number.isFinite(lon))points.push([lat,lon])}if(points.length)routeMapInstance.fitBounds(L.latLngBounds(points),{padding:[35,35],maxZoom:15})
}
function initializeRouteMap(){
  const node=document.querySelector('#route-real-map');if(!node||!window.L)return;
  routeMapInstance=L.map(node,{scrollWheelZoom:false}).setView(routeOrigin||townCenters[town],14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(routeMapInstance);
  routeMapLayers=L.layerGroup().addTo(routeMapInstance);
  routeMapInstance.on('click',event=>{
    if(routeMapMode==='origin'){routeOrigin=[event.latlng.lat,event.latlng.lng];routeResult=null;render()}
    else{routeReportPoint=[event.latlng.lat,event.latlng.lng];const hint=document.querySelector('#route-map-hint'),summary=document.querySelector('#route-point-summary'),button=document.querySelector('#route-report-form [type="submit"]');if(hint)hint.textContent='Punto marcado. Completa el reporte abajo.';if(summary)summary.textContent='Ubicación seleccionada en el mapa.';if(button)button.disabled=false;L.circleMarker(routeReportPoint,{radius:10,color:'#fff',weight:3,fillColor:'#d9363e',fillOpacity:1}).addTo(routeMapLayers);setTimeout(()=>document.querySelector('#route-report-form')?.scrollIntoView({behavior:'smooth',block:'center'}),150)}
  });
  paintRouteLayers();if(routeMapMode!=='report')calculateRoutes();
}
async function compressRoutePhoto(file){
  if(!file)return null;
  if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('Elige una foto JPG, PNG o WebP.');
  if(file.size>10*1024*1024)throw Error('La foto debe pesar menos de 10 MB.');
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const context=canvas.getContext('2d');context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  let quality=.72,blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
  while(blob&&blob.size>110*1024&&quality>.42){quality-=.08;blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality))}
  if(!blob||blob.size>145*1024)throw Error('No se pudo reducir la foto lo suficiente. Prueba con una imagen más pequeña.');
  return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('No se pudo leer la foto.'));reader.readAsDataURL(blob)});
}
async function submitRoadReport(form){
  const status=form.querySelector('.route-form-status'),button=form.querySelector('[type="submit"]');
  button.disabled=true;status.textContent='Preparando el reporte…';
  try{
    const data=new FormData(form),file=data.get('photo'),photoFile=file&&file.size?file:null;
    const report={town,street:'Punto marcado en el mapa',latitude:routeReportPoint?.[0],longitude:routeReportPoint?.[1],hazard:String(data.get('hazard')),severity:String(data.get('severity')||'medium'),impact:String(data.get('impact')||'blocked'),note:String(data.get('note')||'').trim(),photo:await compressRoutePhoto(photoFile)};
    if(!routeReportPoint||!Number.isFinite(report.latitude)||!Number.isFinite(report.longitude)||!Object.hasOwn(hazardLabels,report.hazard)||!['low','medium','high'].includes(report.severity)||!['blocked','partial','passable'].includes(report.impact))throw Error('Marca en el mapa el punto del reporte y selecciona una situación válida.');
    const localReport={...report,created:new Date().toISOString(),id:'local-'+Date.now(),lat:report.latitude,lon:report.longitude};
    const canSync=hosted&&roadMode==='compartido';
    const localReports=[localReport,...localRoadReports()];
    try{localStorage.setItem('sicep.route-reports.v1',JSON.stringify(localReports))}catch{throw Error('No se pudo guardar en este dispositivo. Intenta enviar el reporte sin foto.')}
    roadReports=localReports;roadMode='local';
    let saved='Reporte guardado en este dispositivo.';
    if(canSync){
      try{
        const response=await fetch('/api/routes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report),signal:AbortSignal.timeout(7000)});
        if(!response.ok)throw Error('El servidor no está disponible.');
        const result=await response.json();
        const remaining=localRoadReports().filter(item=>item.id!==localReport.id);
        localStorage.setItem('sicep.route-reports.v1',JSON.stringify(remaining));
        roadReports=mergeRoadReports(result.reports||[]);roadBlocked=result.blocked||roadBlocked;roadMode='compartido';saved='Reporte guardado.';
      }catch{roadReports=localReports;roadMode='local'}
    }
    roadBlocked=[...new Set(roadReports.filter(r=>r.impact==='blocked').map(r=>r.town+':'+r.street))];
    routeReportPoint=null;routeMapMode='origin';routeNotice=saved==='Reporte guardado.'?'Reporte enviado. Ya aparece en el mapa y se tomó en cuenta para calcular las rutas.':'Reporte enviado y guardado en este dispositivo. Ya aparece en el mapa y se tomó en cuenta para calcular las rutas.';render();document.querySelector('.route-feedback')?.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){button.disabled=false;status.textContent=error.message||'No se pudo enviar el reporte.'}
}

const actionCards = [
  ['avisos','Avisos','Boletines y avisos locales'],
  ['refugios','Refugios','Direcciones, acceso y cupo'],
  ['mapa','Mi localidad','Mapa y monitoreo de tu zona'],
  ['planes','Planes de emergencia','Qué hacer según el riesgo'],
  ['guia','Plan familiar','Lista de preparación'],
  ['contactos','Contactos','Números de atención'],
];

function actionPanel(){
  return `<section class="home-section home-actions" aria-labelledby="quick-actions">
    <div class="home-section-head"><h2 id="quick-actions">Acciones rápidas</h2><a class="home-emergency" href="tel:911">${icon('contactos')} Emergencias · 911</a></div>
    <ul>${actionCards.map(([key,title,description])=>`<li><a href="#${key}"><span class="icon">${icon(key)}</span><span><strong>${title}</strong><span class="home-action-description">${description}</span></span></a></li>`).join('')}</ul>
  </section>`;
}

function home(){
  const local=town===1;
  const ruralOverview=ruralRouteTown()===-1||Boolean(ruralLocality());
  const beds=places.filter(place=>place[2]===town&&place[3]==='Abierto').length;
  const people=local?(incident?.stage>0?incident.count:incident?0:'—'):0;
  const shelters=places.map((place,id)=>({place,id})).filter(({place})=>place[2]===town);
  const monitoring=[
    ['volcan','POPOCATEPETL.jpg','Actividad volcánica'],
    ['lluvias','LLUVIAS.jpeg','Lluvias e inundaciones'],
    ['sismos','SISMO.jpeg','Sismos'],
  ];
  return `<div class="home">
    <section class="home-hero">
      <div class="home-intro"><p class="kicker">Protección Civil de Puebla</p>
        <h1>Centro de información de Puebla</h1>
        <p>Avisos, reportes municipales y refugios reunidos por territorio.</p>
      </div>
      <img src="assets/cholula.png" alt="Paisaje ilustrado de Cholula" width="494" height="184">
    </section>
    ${actionPanel()}
    <section class="home-section home-municipal" aria-labelledby="home-municipal-title">
      <div class="home-section-head home-territory-head">
        <div><p class="kicker">Panorama municipal</p><h2 id="home-municipal-title">Situación en ${escapeHTML(ruralScope())}</h2></div>
        ${ruralFilters()}
      </div>
      ${ruralOverview?`<p>Consulta la información disponible para esta zona.</p><div class="rural-home-links">
        <a class="link" href="#mapa">Ver mapa y pronóstico</a><a class="link" href="#avisos">Ver comunicados</a><a class="link" href="#refugios">Buscar refugios</a>
      </div>`:`<div class="home-municipal-grid">
        <article class="card home-municipal-card"><h3>Avisos y reportes</h3>
          <dl class="home-metrics"><div><dt>Comunicados en el historial</dt><dd>${municipalNews.filter(notice=>notice.towns.includes(town)).length}</dd></div><div><dt>Personas reportadas</dt><dd>${people}</dd></div></dl>
          <p><strong>Caso de práctica:</strong> ${alerts[town][1]}</p><a class="link" href="#avisos">Consultar comunicados del municipio</a>
        </article>
        <article class="card home-municipal-card"><h3>Refugios</h3><p>${beds} ${beds===1?'abierto':'abiertos'} en el ejercicio</p>
          <ul class="home-shelter-list">${shelters.map(({place,id})=>`<li><a class="shelterLine" href="#detalle/${id}"><span><b>${place[0]}</b><span>${shelterCapacity(id)}</span></span>${shelterBadge(place[3])}</a></li>`).join('')}</ul>
          <a class="link" href="#refugios">Ver directorio y mapa</a>
        </article>
      </div>`}
    </section>
    <div class="home-updates">
      ${bulletinPanel()}
      <section class="card home-monitoring-panel" aria-labelledby="monitoring-title">
        <div class="home-section-head"><h2 id="monitoring-title">Monitoreo</h2></div>
        <div class="home-monitoring">${monitoring.map(([route,image,title])=>`<a href="#planes/${route}"><img src="assets/${image}" alt="" loading="lazy"><strong>${title}</strong></a>`).join('')}</div>
      </section>
    </div>
  </div>`;
}
function shelterCapacity(id){
  if(id!==2||!incident)return 'Cupo disponible por confirmar';
  const available=Math.max(0,40-(incident.stage>=2?incident.count:0));
  return available===1?'1 lugar disponible en la simulación':available+' lugares disponibles en la simulación';
}

function shelterBadge(status){
  return `<span class="pill shelter-badge" data-status="${status}">${status}</span>`;
}

function shelterResults(){
  const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const query=normalize(shelterQuery.trim());
  const municipality=shelterTowns.indexOf(ruralMunicipalityName());
  const matches=places.map((place,id)=>({place,id})).filter(({place,id})=>
    place[2]===municipality && (!ruralLocality()||ruralShelters[id]?.locality===ruralLocality()[1]) && (!shelterStatus||place[3]===shelterStatus) &&
    normalize([place[0],place[1],ruralShelters[id]?.locality].join(' ')).includes(query)
  );
  const count=matches.length;
  const map=mode==='mapa' && count>0 ? shelterMap(matches) : '';
  return `
    <p class="shelter-count" role="status">${count} ${count===1?'refugio':'refugios'} en ${escapeHTML(ruralScope())}</p>
    ${map}
    ${count===0?'<div class="card shelter-empty"><h2>Sin refugios en este filtro</h2><p>Consulta el plan estatal o amplía la búsqueda a todo el municipio.</p><button type="button" data-clear-shelters>Limpiar filtros</button></div>':
    `<ul class="shelter-list">${matches.map(({place,id})=>`
      <li><a class="row shelter-card" href="#detalle/${id}">
        <span class="icon">${icon('refugios')}</span>
        <div class="shelter-info"><h2>${place[0]}</h2><p>${ruralShelters[id] ? ruralShelters[id].locality+' · ' : ''}${place[1]}</p><p class="shelter-capacity">${shelterCapacity(id)}</p></div>
        ${shelterBadge(place[3])}
      </a></li>`).join('')}</ul>`}
  `;
}

function shelterMap(matches){
  if(ruralMunicipalityName()!==shelterTowns[0]){
    const selected=matches.find(({id})=>id===shelterMapId)||matches[0];
    const {id,place}=selected;
    const rural=ruralShelters[id];
    const address=[place[1],shelterTowns[place[2]],'Puebla, México'].join(', ');
    const marker=encodeURIComponent(rural?rural.point.join(','):address);
    const label=rural?rural.locality:place[0];
    return `<section class="card shelter-map-card" aria-label="Mapa de refugios">
      <label>Punto en el mapa<select id="shelter-map-point">
      ${matches.map(({id:optionId,place:option})=>`<option value="${optionId}"${optionId===id?' selected':''}>${ruralShelters[optionId]?.locality ? ruralShelters[optionId].locality+' · ' : ''}${option[0]}</option>`).join('')}
      </select></label>
      <iframe title="Mapa de ${label}" src="https://maps.google.com/maps?q=${marker}&amp;z=15&amp;output=embed" loading="lazy" referrerpolicy="no-referrer"></iframe>
      <p class="shelter-map-hint">${rural?'El marcador señala el centro de la localidad. Confirma la ubicación exacta del inmueble con Protección Civil.':'Ubicación de referencia. Confirma la dirección con Protección Civil.'}</p>
      <a class="link" href="https://www.google.com/maps/search/?api=1&amp;query=${marker}" target="_blank" rel="noopener">Abrir mapa de ${label}</a>
    </section>`;
  }
  const pins=[[0,54,10],[1,17,46]].filter(([id])=>matches.some(match=>match.id===id));
  return `<div class="map"><div class="mapinner" style="transform:scale(${zoom})">
    ${pins.map(([id,x,y])=>`<a class="pin shelter-pin" href="#detalle/${id}" aria-label="${places[id][0]}" style="left:${x}%;top:${y}%">${icon('refugios')}</a>`).join('')}
    </div><div class="zoom"><button type="button" data-zoom="1" aria-label="Acercar">+</button><button type="button" data-zoom="-1" aria-label="Alejar">−</button></div>
  </div><p class="hint shelter-map-hint">Mapa ilustrativo de San Pedro Cholula.</p>`;
}

function shelters(){
  const options=['Abierto','Acceso bloqueado','Sin confirmar'];
  return `${back()}
    <div class="shelter-intro"><span class="kicker">Refugios disponibles</span>
    <h1>Refugios temporales</h1>
    <p>Encuentra refugios por municipio o comunidad y ubícalos en el mapa.</p></div>
    <p class="shelter-source">Los registros rurales provienen del plan estatal. Consulta con Protección Civil si están habilitados antes de trasladarte.${profile==='coordinacion'?'':` <a class="link" href="${shelterPlan}" target="_blank" rel="noopener">Ver plan estatal</a>`}</p>
    <div class="card shelter-filters" aria-label="Filtros del directorio" role="group">
      ${ruralFilters()}
      <label>Buscar refugio<input id="shelter-query" type="search" placeholder="Nombre, localidad o dirección" value="${escapeHTML(shelterQuery)}"></label>
      <label>Estado<select id="shelter-status"><option value="">Todos los estados</option>
        ${options.map(status=>`<option${status===shelterStatus?' selected':''}>${status}</option>`).join('')}</select></label>
    </div>
    <div class="segment shelter-view" role="group" aria-label="Vista del directorio">
      <button type="button" data-mode="lista" aria-pressed="${mode==='lista'}">Lista</button>
      <button type="button" data-mode="mapa" aria-pressed="${mode==='mapa'}">Mapa</button>
    </div>
    <div id="shelter-results">${shelterResults()}</div>`;
}

function detail(id){
  const place=places[id];
  if(!place)return shelters();
  if(place[2]<towns.length && place[2]!==town)changeMunicipality(place[2]);
  const rural=ruralShelters[id];
  const address=[place[1],rural?.locality,shelterTowns[place[2]],'Puebla, México'].filter(Boolean).join(', ');
  const directions='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(address);
  const access={
    'Abierto':'Confirma el acceso con las autoridades antes de trasladarte.',
    'Acceso bloqueado':'El acceso está bloqueado en el ejercicio. Consulta otros refugios del municipio.',
    'Sin confirmar':'El acceso está pendiente de confirmar en el ejercicio.',
  };
  return `${back('refugios','Refugios')}
    <div class="shelter-intro"><span class="kicker">Refugios disponibles</span><h1>${place[0]}</h1>${shelterBadge(place[3])}</div>
    <div class="card shelter-detail">
      <h2>Dirección</h2><p>${address}</p>
      ${rural? `<a class="link" href="${shelterPlan}" target="_blank" rel="noopener">Consultar ficha en el plan estatal</a>` : ''}
      <h2>Acceso y capacidad</h2><p>${access[place[3]]}</p>
      <p>${place[4]}</p><p class="shelter-capacity">${shelterCapacity(id)}</p>
    </div>
    ${place[3]==='Abierto'? `<a class="btn" href="${directions}" target="_blank" rel="noopener">Ver dirección en Google Maps</a>` :
      '<a class="btn" href="#refugios">Consultar otros refugios</a>'}`;
}

function refreshShelterResults(){
  document.querySelector('#shelter-results').innerHTML=shelterResults();
}
const source='<a class="link" target="_blank" rel="noopener" href="https://proteccioncivil.puebla.gob.mx/">Protección Civil del Estado de Puebla</a>';
function caseDetails(){return{locality:'Atempan',reportedAt:incident?.updated||new Date().toISOString(),source:'Protección Civil municipal',impact:'Inundación; familias requieren alojamiento temporal.',need:'Alojamiento temporal',verification:incident?.stage>=2?'Verificado':'Pendiente de verificar',...(incident?.details||{})}}
function caseForm(details,count){const localDate=new Date(new Date(details.reportedAt).getTime()-new Date(details.reportedAt).getTimezoneOffset()*60000).toISOString().slice(0,16);return `<form id="report" class="case-form"><h2>${incident?.stage?'Actualizar datos del incidente':'Registrar incidente'}</h2><div class="case-form-grid"><label>Localidad<input name="locality" value="${escapeHTML(details.locality)}" maxlength="100" required></label><label>Fecha y hora del reporte<input type="datetime-local" name="reportedAt" value="${localDate}" required></label><label>Origen del reporte<select name="source">${['Protección Civil municipal','Llamada al 911','Radio','Reporte ciudadano'].map(x=>`<option ${details.source===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Necesidad principal<select name="need">${['Alojamiento temporal','Evacuación','Atención médica','Alimentos y agua','Otro'].map(x=>`<option ${details.need===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="case-form-wide">Afectación reportada<textarea name="impact" rows="3" maxlength="300" required>${escapeHTML(details.impact)}</textarea></label><label>Personas estimadas<input type="number" name="count" min="1" max="9999" value="${count}" required></label><label>Verificación<select name="verification"><option ${details.verification==='Pendiente de verificar'?'selected':''}>Pendiente de verificar</option><option ${details.verification==='Verificado'?'selected':''}>Verificado</option></select></label></div><div class="case-actions"><button type="submit">${incident?.stage?'Guardar cambios':'Registrar y abrir expediente'}</button>${incident?.stage?'<button type="button" class="route-refresh" data-case-cancel>Cancelar</button>':''}</div></form>`}
const attentionStates=['Pendiente','En atención','Parcial','Atendida'];
const brigadeNames=['Brigada Atempan 01','Brigada Atempan 02'];
function brigadeTaskList(){
  const assignments=caseDirectory.filter(row=>row.stage>=2);
  const active=assignments.filter(row=>!row.closed);
  const closed=assignments.filter(row=>row.closed);
  const list=tasks=>`<ul class="brigade-task-list">${tasks.map(row=>`<li>
    <button type="button" data-open-case="${row.id}" aria-pressed="${row.id===caseId}">
      <strong>${escapeHTML(row.locality)}</strong>
      <span>${row.closed?'Cerrada':row.stage===2?'Por aceptar':'Aceptada'}</span>
    </button></li>`).join('')}</ul>`;
  return `<section class="card brigade-task-picker"><h2>Tareas activas</h2>
    ${active.length?list(active):'<p>Sin tareas activas.</p>'}
    ${closed.length?`<details ${closed.some(row=>row.id===caseId)?'open':''}><summary>Tareas cerradas</summary>${list(closed)}</details>`:''}
  </section>`;
}
function validationPanel(details,openChildren=0){
  const validation=details.validation;
  if(!details.attention)return '';
  return `<section class="card case-form"><h2>Validación y cierre</h2>
    ${validation?`<p><strong>${escapeHTML(validation.result)}</strong> · ${escapeHTML(validation.note)} · ${caseTime(validation.updated)}</p>`:''}
    ${details.closedAt?`<p class="pill">Expediente cerrado · ${caseTime(details.closedAt)}</p>`:
      details.needClosedAt?`<p>Necesidad cerrada · ${caseTime(details.needClosedAt)}</p>${openChildren?`<p>Necesidades vinculadas pendientes: ${openChildren}.</p>`:'<button type="button" data-case-operation="close-case">Cerrar expediente</button>'}`:
      `<form id="validate-case" class="case-form"><label>Resultado<select name="result">${['Pendiente','Parcial','Completa'].map(result=>`<option ${result===validation?.result?'selected':''}>${result}</option>`).join('')}</select></label>
       <label>Fundamento o pendientes<textarea name="note" maxlength="300" required>${escapeHTML(validation?.note||'')}</textarea></label><button>Validar resultado</button></form>
       ${validation?.result==='Completa'?'<button type="button" data-case-operation="close-need">Cerrar necesidad</button>':''}`}
  </section>`;
}
function resourcePanel(resources,stage){
  if(!stage)return '';
  return `<section class="card case-form"><h2>Recursos del expediente</h2>
    <p>Auditorio Municipal · capacidad nominal de 500 personas.</p>
    <p>${resources.updated?`Verificación · ${caseTime(resources.updated)} · ${resources.capacity} cupos · ${resources.open?'abierto':'cerrado'} · ${resources.access?'acceso transitable':'acceso sin confirmar o bloqueado'}`:'Disponibilidad pendiente de confirmar.'}</p>
    ${stage===1?`<form id="verify-resources" class="case-form">
      <label>Cupo confirmado<input type="number" name="capacity" min="0" max="500" value="${resources.capacity}" required></label>
      <label><input type="checkbox" name="open" ${resources.open?'checked':''}> Refugio abierto</label>
      <label><input type="checkbox" name="access" ${resources.access?'checked':''}> Acceso transitable</label>
      <fieldset><legend>Brigadas disponibles</legend>
        ${brigadeNames.map((name,index)=>`<label><input type="checkbox" name="available" value="${name}" ${resources.available.includes(name)?'checked':''}> ${name} · ${index===0?'radio y vehículo':'primeros auxilios'}</label>`).join('')}
      </fieldset><button>Confirmar recursos</button>
    </form>`:''}
  </section>`;
}
function attentionPanel(details,stage,field=false){
  const progress=details.attention;
  return `<section class="card case-history">
    <h2>${field?'Reportar avance':'Seguimiento de la atención'}</h2>
    <p><strong>${escapeHTML(details.need)}</strong> · ${progress?.status||attentionStates[0]}</p>
    ${progress?.note?`<p>${escapeHTML(progress.note)}</p><small>Actualizado · ${caseTime(progress.updated)} (Puebla)${progress.actor?' · '+escapeHTML(progress.actor):''}</small>`:''}
    ${stage===3&&!details.needClosedAt?`<form id="attention-form" class="case-form">
      <label>Estado de la necesidad<select name="status">${attentionStates.map(status=>`<option ${status===progress?.status?'selected':''}>${status}</option>`).join('')}</select></label>
      <label>Avance o pendiente<textarea name="note" rows="3" maxlength="300" required ${field?'placeholder="Describe el acceso, los impedimentos o el apoyo que hace falta"':''}>${field?'':escapeHTML(progress?.note||'')}</textarea></label>
      <button>${field?'Registrar avance':'Guardar seguimiento'}</button>
    </form>`:details.needClosedAt?'<p>Necesidad cerrada.</p>':'<p>El seguimiento se habilita cuando la brigada acepta la tarea.</p>'}
  </section>`;
}
function coordination(){
  const stage=incident?.stage||0,details=caseDetails();
  const resources=details.resources||{capacity:0,open:false,access:false,available:[]};
  const children=caseDirectory.filter(row=>row.parentId===caseId);
  const openChildren=children.filter(row=>!row.closed).length;
  const title=incident?.id?caseFolio():'Expediente municipal';
  const status=details.closedAt?'Cerrado':stageName[stage];
  const timeline=(incident?.history||[]).slice().reverse().map(event=>`<li><b>${escapeHTML(event.title)}</b><small>${escapeHTML(event.actor)} · ${caseTime(event.created)}</small><span>${escapeHTML(event.summary)}</span></li>`).join('');
  const parentLink=details.parentId?`<button type="button" class="route-refresh" data-open-case="${details.parentId}">Ir al incidente ${caseFolio(details.parentId)}</button>`:'';
  const directory=caseDirectory.filter(row=>!row.parentId);
  const sidebar=`<aside class="card coord-directory"><div class="coord-directory-heading"><h2>Incidentes</h2><button type="button" data-new-case>Nuevo incidente</button></div>
    ${directory.length?`<ul>${directory.map(row=>`<li><button type="button" data-open-case="${row.id}" aria-pressed="${row.id===(details.parentId||caseId)}"><strong>${caseFolio(row.id)}</strong><span>${escapeHTML(row.locality)} · ${row.closed?'Cerrado':stageName[row.stage]}</span></button></li>`).join('')}</ul>`:'<p>Sin incidentes para mostrar.</p>'}</aside>`;
  const description=stage===0?'Completa los datos para registrar el reporte.':
    details.closedAt?'El resultado quedó validado y el expediente se cerró.':
    stage===1?details.verification==='Pendiente de verificar'?'Verifica el reporte antes de asignar una brigada.':'Revisa los recursos y confirma la asignación.':
    stage===2?`${escapeHTML(details.brigade||'La brigada asignada')} tiene pendiente acusar recibo.`:
    details.needClosedAt?(openChildren?'Cierra las necesidades vinculadas pendientes.':'La necesidad está cerrada. Puedes cerrar el expediente.'):
    !details.attention?'La tarea fue aceptada. El avance aparecerá cuando se registre.':
    details.validation?.result==='Completa'?'El resultado está validado. Puedes cerrar la necesidad.':
    'Revisa el avance y valida el resultado.';
  const sections=[['resumen','Incidente'],...(stage?[['asignacion','Asignación'],['seguimiento','Seguimiento'],['historial','Historial']]:[])];
  const preferred=stage===1&&details.verification!=='Pendiente de verificar'?'asignacion':stage>=2?'seguimiento':'resumen';
  const active=sections.some(([key])=>key===coordinationSection)?coordinationSection:preferred;
  let content='';
  if(active==='resumen'){
    content=`<section class="card case-dossier"><h3>Datos del incidente</h3>
      ${stage===0||coordEditing?caseForm(details,incident?.count||35):`<div class="case-facts">
        <div><small>Localidad</small><b>${escapeHTML(details.locality)}</b></div>
        <div><small>Fecha del reporte</small><b>${caseTime(details.reportedAt)}</b></div>
        <div><small>Origen</small><b>${escapeHTML(details.source)}</b></div>
        <div><small>Personas estimadas</small><b>${incident.count}</b></div>
        <div><small>Necesidad principal</small><b>${escapeHTML(details.need)}</b></div>
        <div><small>Verificación</small><b>${escapeHTML(details.verification)}</b></div>
        <div class="case-fact-wide"><small>Afectación</small><b>${escapeHTML(details.impact)}</b></div>
      </div>${stage===1?'<button type="button" class="route-refresh" data-case-edit>Editar y verificar incidente</button>':''}`}
    </section>${stage&&!details.parentId?`<section class="card case-form"><h3>Necesidades vinculadas</h3>
      ${children.length?`<ul>${children.map(row=>`<li><button type="button" class="route-refresh" data-open-case="${row.id}">${caseFolio(row.id)} · ${row.closed?'Cerrada':stageName[row.stage]}</button></li>`).join('')}</ul>`:'<p>Sin necesidades adicionales.</p>'}
      ${details.closedAt?'':`<button type="button" data-new-case data-parent-case="${caseId}">Agregar necesidad</button>`}
    </section>`:''}`;
  }
  if(active==='asignacion'){
    const recommended=details.need==='Atención médica'?brigadeNames[1]:brigadeNames[0];
    const missing=[
      ...(!['Verificado','Verificado en el ejercicio'].includes(details.verification)?['Verificar el reporte en Incidente.']:[]),
      ...(!resources.updated?['Guardar la verificación de recursos.']:[]),
      ...(!resources.open?['Confirmar que el refugio esté abierto.']:[]),
      ...(!resources.access?['Confirmar que el acceso sea transitable.']:[]),
      ...(resources.capacity<incident.count?[`Confirmar al menos ${incident.count} cupos.`]:[]),
      ...(!resources.available.length?['Confirmar que haya una brigada disponible.']:[]),
    ];
    const assignment=stage>=2?`<section class="card case-task"><h3>Tarea asignada</h3>
      <div class="case-facts"><div><small>Brigada responsable</small><b>${escapeHTML(details.brigade||'Sin brigada')}</b></div>
      <div><small>Refugio</small><b>${escapeHTML(details.shelter||'Sin refugio')}</b></div>
      <div><small>Recepción</small><b>${stage===3?'Confirmada':'Pendiente de acuse'}</b></div></div>
      <p>Verificar el acceso, preparar la recepción de ${incident.count} personas y reportar impedimentos.</p></section>`:missing.length?`<section class="card case-task"><h3>Pendientes para asignar</h3>
      <ul>${missing.map(item=>`<li>${item}</li>`).join('')}</ul>
      ${details.supportRequested?'<p class="pill">Solicitud de apoyo regional registrada</p>':'<button type="button" data-support-request>Registrar solicitud de apoyo regional</button>'}</section>`:
      `<form id="assignment" class="card case-task"><h3>Propuesta de atención</h3>
      <p>Auditorio Municipal · ${resources.capacity} cupos para ${incident.count} personas.</p>
      <p>${resources.available.includes(recommended)?`Se recomienda ${recommended} por ${details.need==='Atención médica'?'su capacidad de primeros auxilios':'su radio y vehículo'}.`:'La brigada con el equipo recomendado figura como no disponible.'}</p>
      <input type="hidden" name="shelter" value="Auditorio Municipal">
      <label>Brigada a cargo<select name="brigade">${resources.available.map(name=>`<option ${name===recommended?'selected':''}>${name}</option>`).join('')}</select></label>
      <button>Confirmar asignación</button></form>`;
    content=stage===1?resourcePanel(resources,stage)+assignment:assignment+resourcePanel(resources,stage);
  }
  if(active==='seguimiento')content=stage<2?'<section class="card"><h3>Seguimiento</h3><p>Confirma una asignación para dar seguimiento a la tarea.</p></section>':
    stage===2?'<section class="card"><h3>Recepción pendiente</h3><p>El seguimiento se habilita cuando la brigada acepta la tarea.</p></section>':
    attentionPanel(details,stage)+validationPanel(details,openChildren)+radioLog(details,stage);
  if(active==='historial')content=`<section class="card case-history"><h3>Movimientos del folio</h3>
    ${timeline?`<ol>${timeline}</ol>`:'<p>Aún no hay movimientos registrados.</p>'}</section>`;
  return `${back()}<h1>Coordinación municipal</h1><p class="coord-connection">${escapeHTML(connection)}</p>
    <div class="coord-workspace">${sidebar}<div class="coord-expedient">
      <section class="card coord-summary"><div><span class="kicker">${details.parentId?'Necesidad vinculada':'Expediente municipal'}</span>
        <h2>${title}</h2></div><span class="pill neutral">${status}</span>
        <p>${description}</p>${parentLink}
      </section>
      ${sections.length>1?`<div class="coord-sections" role="group" aria-label="Secciones del expediente">
        ${sections.map(([key,label])=>`<button type="button" data-coord-section="${key}" aria-pressed="${active===key}">${label}</button>`).join('')}
      </div>`:''}
      <div class="coord-content">${content}</div>
    </div></div>`;
}
function caseTime(value){
  return new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'}).format(new Date(value));
}

function radioLog(details,stage,field=false){
  const messages=details.radioMessages||[];
  const brigade=escapeHTML(details.brigade||'Brigada Atempan 01');
  return `<section class="card case-radio" aria-labelledby="case-radio-title">
    <h2 id="case-radio-title" class="section-icon-title"><span class="icon">${icon('radio')}</span>Bitácora de radio</h2>
    <p class="muted">Comunicaciones por radio · Folio ${caseFolio()}.</p>
    ${details.closedAt?'':field?'<p>Comunica los impedimentos por radio institucional si pierdes la conexión. Coordinación registra el mensaje y su acuse en este folio.</p>':stage===3&&messages.length<30?`<form id="case-radio-form">
      <label>Tipo de comunicación<select name="type"><option value="report">Reporte de brigada</option><option value="instruction">Instrucción de Coordinación</option></select></label>
      <label>Mensaje comunicado por radio<textarea name="message" rows="3" maxlength="320" required></textarea></label>
      <label>Referencia del avance sin conexión (opcional)<input name="reference" maxlength="36"></label>
      <button>Registrar mensaje</button>
    </form>`:stage===2?'<p>La captura se habilita cuando la brigada acepta la tarea.</p>':'<p>Se alcanzó el límite de mensajes del folio.</p>'}
    ${messages.length?`<ul>${messages.map(message=>`<li>
      <div class="case-radio-meta"><strong>${message.type==='instruction'?`Coordinación municipal → ${brigade}`:`${brigade} → Coordinación municipal`}</strong>
      <span class="pill ${message.receivedAt?'':'neutral'}">${message.receivedAt?'Acuse registrado':'Pendiente de acuse'}</span></div>
      <p>${escapeHTML(message.text)}</p>${message.reference?`<small>${message.linked?'Avance digital vinculado':'Pendiente de vincular'} · ${escapeHTML(message.reference)}</small>`:''}<small>Captura · ${caseTime(message.sentAt)} (Puebla)</small>
      ${message.receivedAt?`<small>Acuse ${message.type==='instruction'?'de brigada':'de Coordinación'} · ${caseTime(message.receivedAt)} (Puebla)</small>`:
      field||details.closedAt?'':`<button type="button" data-radio-ack="${escapeHTML(message.id)}">Registrar acuse de radio</button>`}
    </li>`).join('')}</ul>`:'<p class="muted">Sin mensajes registrados.</p>'}
  </section>`;
}

function roleHome(){
  const field=profile==='brigada';
  const details=caseDetails();
  const stage=incident?.stage||0;
  const messages=details.radioMessages||[];
  const pending=messages.filter(message=>!message.receivedAt).length;
  const links=field?[
    ['rutas','Consultar rutas','Revisa los trayectos y reportes de calles.'],
    ['refugios','Directorio de refugios','Consulta el acceso, el cupo y la ubicación.'],
    ['contactos','Contactos de emergencia','Consulta los números de atención.'],
  ]:[
    ['refugios','Directorio de refugios','Consulta capacidad, acceso y ubicación.'],
  ];
  const tasks=caseDirectory.filter(row=>row.stage>=2&&!row.closed);
  const status=field?(stage===3?'Tarea aceptada':stage===2?'Pendiente de aceptar':tasks.length?'Tareas disponibles':'Sin tareas asignadas'):stageName[stage];
  const destination=field?'brigada':'coord';
  const primaryLabel=field?'Abrir Mis tareas':stage?'Abrir expediente':'Registrar incidente';
  return `<div class="home role-home">
    <section class="home-hero role-hero">
      <div class="home-intro">
        <p class="kicker">Protección Civil de Puebla · Atempan</p>
        <h1>${field?'Brigada':'Coordinación municipal'}</h1>
        <p>${field?'Consulta tus asignaciones y confirma la recepción de tareas.':'Registra incidentes, coordina asignaciones y revisa las comunicaciones por folio.'}</p>
        <a class="btn" href="#${destination}">${icon('coord')} ${primaryLabel}</a>
      </div>
      <img src="assets/cholula.png" alt="Paisaje ilustrado de Cholula" width="494" height="184">
    </section>
    <section class="role-tools-section" aria-labelledby="role-tools-title">
      <div class="home-section-head"><h2 id="role-tools-title">Acciones rápidas</h2></div>
      <div class="role-tools">
      ${links.map(([key,title,description])=>`<a class="card role-tool" href="#${key}"><span class="icon">${icon(key)}</span><span><strong>${title}</strong><span>${description}</span></span></a>`).join('')}
      </div>
    </section>
    <section class="card role-overview" aria-labelledby="role-overview-title">
      <div class="role-overview-heading"><div>
        <h2 id="role-overview-title">${field?'Tu próxima tarea':'Expediente de Atempan'}</h2></div><span class="pill ${stage===3?'':'neutral'}">${status}</span></div>
      ${field?(stage>=2?`<p>${escapeHTML(details.brigade||'Brigada Atempan 01')} · ${escapeHTML(details.shelter||'Auditorio Municipal')}</p><p class="muted">Folio ${caseFolio()}</p><dl class="role-metrics"><div><dt>Estado de la atención</dt><dd>${escapeHTML(details.attention?.status||attentionStates[0])}</dd></div></dl>`:
        tasks.length?`<p>${tasks.length} ${tasks.length===1?'tarea activa':'tareas activas'}. Consulta el listado en Mis tareas.</p>`:'<p>Las asignaciones confirmadas por Coordinación aparecerán aquí.</p>'):
        `<p class="muted">Folio ${caseFolio()} · ${escapeHTML(connection)}</p>
        <dl class="role-metrics"><div><dt>Personas estimadas</dt><dd>${stage?incident.count:'—'}</dd></div>
        <div><dt>Mensajes pendientes de acuse</dt><dd>${pending}</dd></div><div><dt>Estado de la necesidad</dt><dd>${stage?(details.attention?.status||attentionStates[0]):'—'}</dd></div></dl>`}
    </section>
  </div>`;
}

function pendingFieldReports(){
  const entries=readCaseStorage(reportQueueKey,[]).filter(item=>item.caseId===caseId&&(item.operatorKey||'')===operatorKey);
  return entries.length?`<section class="card"><h2>Reportes pendientes de envío</h2><ul>
    ${entries.map(item=>`<li>${escapeHTML(item.attention.note)} · Referencia ${escapeHTML(item.attention.id)}</li>`).join('')}
    </ul><button type="button" data-retry-case-sync>Reintentar envío</button></section>`:'';
}

function brigadeView(){
  const details=caseDetails();
  const stage=incident?.stage||0;
  const accepted=stage===3;
  const closed=Boolean(details.closedAt||details.needClosedAt);
  const task=stage>=2?`<section class="card case-task brigade-task-detail">
    <span class="pill neutral">${closed?'Cerrada':accepted?'Aceptada':'Por aceptar'}</span>
    <h2>${escapeHTML(details.need)}</h2>
    <p class="muted">${escapeHTML(details.locality)} · ${caseFolio()}</p>
    <p>${escapeHTML(details.impact)}</p>
    <div class="case-facts">
      <div><small>Personas estimadas</small><b>${incident.count}</b></div>
      <div><small>Refugio asignado</small><b>${escapeHTML(details.shelter||'Auditorio Municipal')}</b></div>
    </div>
    ${!accepted?`<p>Acepta la tarea para registrar avances.</p>
      <button type="button" data-step="3">Aceptar tarea</button>`:
      closed?'':`<div class="case-actions"><a class="link" href="#detalle/2">Ver refugio</a><a class="link" href="#rutas">Consultar rutas</a></div>`}
    </section>`:'';
  return `${back()}<h1>Mis tareas</h1>
    ${connection.startsWith('Sin conexión')?`<p role="status">${escapeHTML(connection)}</p>`:''}
    ${brigadeTaskList()}${task}
    ${accepted?`${pendingFieldReports()}${attentionPanel(details,stage,true)}
      ${details.radioMessages?.length?`<details class="card brigade-radio"><summary>Comunicaciones por radio</summary>${radioLog(details,stage,true)}</details>`:''}`:''}`;
}

let bulletinData=null;
const municipalNews=[
  {date:'2026-11-14',topic:'Lluvias',territory:'Sierras Norte y Nororiental',towns:[1],
    title:'Previsión de lluvias intensas del 16 al 18 de noviembre',
    summary:'Protección Civil publicó un pronóstico para la Sierra Norte y la Sierra Nororiental. El periodo de ese aviso ya concluyó.',
    slug:'25847-proteccion-civil-estatal-preve-lluvias-intensas-en-puebla'},
  {date:'2026-10-14',topic:'Temporada invernal',territory:'Puebla · estatal',towns:[0,1],
    title:'Preparación de Dormitorios Seguros para la temporada invernal',
    summary:'El estado informó sobre la entrega de insumos en municipios expuestos a bajas temperaturas.',
    slug:'25490-gobierno-estatal-avanza-en-generar-condiciones-de-bienestar-ante-la-temporada-invernal'},
  {date:'2026-09-18',topic:'Prevención',territory:'Puebla · estatal',towns:[0,1],
    title:'Recorridos preventivos y monitoreo en los municipios',
    summary:'La coordinación estatal publicó un balance de vigilancia y recorridos preventivos en el estado.',
    slug:'25193-con-recorridos-preventivos-y-monitoreo-permanente-gobierno-estatal-vigila-los-217-municipios'},
  {date:'2026-09-07',topic:'Refugios',territory:'Puebla · estatal',towns:[0,1],
    title:'Habilitación de refugios para la temporada de lluvias',
    summary:'El comunicado reportó 106 espacios habilitados en 43 municipios. Consulta la disponibilidad actual antes de trasladarte.',
    slug:'25066-gobierno-del-estado-y-ayuntamientos-habilitan-106-refugios-por-temporada-de-lluvias'},
  {date:'2026-07-09',topic:'Lluvias',territory:'San Pedro Cholula y otros municipios',towns:[0],
    title:'Monitoreo y atención por lluvias en distintos municipios',
    summary:'El boletín incluyó a San Pedro Cholula entre los municipios con lluvias ligeras durante el periodo reportado.',
    slug:'24326-proteccion-civil-intensifica-monitoreo-y-atencion-por-lluvias-en-diferentes-municipios'},
  {date:'2026-06-28',topic:'Lluvias',territory:'Zona metropolitana de Puebla',towns:[0],
    title:'Atención a afectaciones por lluvias en la zona metropolitana',
    summary:'Protección Civil informó sobre el despliegue de personal y la atención de incidentes en la región metropolitana.',
    slug:'24217-proteccion-civil-atiende-afectaciones-por-lluvias-en-zona-metropolitana'},
];
let municipalTopic='';
function municipalNotices(){
  const relevant=municipalNews.filter(notice=>notice.territory==='Puebla · estatal'||notice.towns.includes(ruralRouteTown()));
  const topics=[...new Set(relevant.map(notice=>notice.topic))];
  if(!topics.includes(municipalTopic))municipalTopic='';
  const matches=relevant.filter(notice=>!municipalTopic||notice.topic===municipalTopic);
  const format=new Intl.DateTimeFormat('es-MX',{dateStyle:'long',timeZone:'UTC'});
  return `${back()}<div class="notices-header"><div><h1>Avisos municipales</h1>
      <p>Comunicados de Protección Civil relacionados con tu municipio.</p></div>
      <a class="btn" href="#refugios">${icon('refugios')} Ver refugios</a></div>
    <div class="notices-filters">${ruralFilters()}<label>Tema<select id="municipal-topic"><option value="">Todos los temas</option>
      ${topics.map(topic=>`<option${topic===municipalTopic?' selected':''}>${topic}</option>`).join('')}</select></label></div>
    <section aria-labelledby="municipal-notices-title">
      <h2 id="municipal-notices-title">Historial de comunicados</h2>
      <p class="muted">${matches.length} ${matches.length===1?'publicación':'publicaciones'} para ${escapeHTML(ruralScope())} y su región. La fecha indica cuándo se publicó cada comunicado.</p>
      <ul class="notices-list">${matches.map(notice=>`<li class="notice-entry">
        <img class="notice-photo" src="assets/aviso-${notice.slug.split('-',1)[0]}.jpg" alt="" width="400" height="300" loading="lazy" decoding="async">
        <div class="notice-copy"><div class="notice-meta"><time datetime="${notice.date}">${format.format(new Date(notice.date+'T00:00:00Z'))}</time>
          <span>${notice.topic}</span><span>${notice.territory}</span></div>
        <h3><a href="https://puebla.gob.mx/index.php/noticias/item/${notice.slug}" target="_blank" rel="noopener noreferrer">${notice.title}</a></h3>
        <p>${notice.summary}</p></div>
      </li>`).join('')}</ul>
    </section>`;
}
const bulletinPortal='https://www.puebla.gob.mx/index.php/noticias';

function bulletinPanel(){
  return `<section class="card bulletin-carousel" id="bulletins" aria-labelledby="bulletins-title">
    <small>Gobierno del Estado de Puebla</small>
    <h2 id="bulletins-title">Boletines estatales de protección civil</h2>
    <ul id="bulletinList" class="bulletin-track" aria-label="Noticias de protección civil" tabindex="0"></ul>
    <div class="bulletin-footer">
      <a class="link" href="${bulletinPortal}" target="_blank" rel="noopener noreferrer">Ver todas las noticias</a>
      <div class="bulletin-navigation" role="group" aria-label="Navegación de boletines" hidden>
        <button type="button" data-bulletin-step="-1" aria-label="Noticia anterior">‹</button>
        <button type="button" data-bulletin-step="1" aria-label="Noticia siguiente">›</button>
      </div>
    </div>
  </section>`;
}

function paintBulletins(){
  const carousel=document.querySelector('#bulletins');
  if(!carousel)return;
  const format=new Intl.DateTimeFormat('es-MX',{dateStyle:'long',timeZone:'UTC'});
  const items=new Map();
  const archive=municipalNews.map(({slug,title,date,topic})=>({
    url:bulletinPortal+'/item/'+slug,title,topic,
    published:format.format(new Date(date+'T00:00:00Z')),
    image:'assets/aviso-'+slug.split('-',1)[0]+'.jpg',
  }));
  for(const item of [...(bulletinData?.items||[]),...archive]){
    const url=new URL(item.url,bulletinPortal);
    if(!['https://www.puebla.gob.mx','https://puebla.gob.mx'].includes(url.origin))continue;
    const key=url.pathname;
    const previous=items.get(key);
    items.set(key,previous?{...item,...previous}:item);
  }
  const stories=[...items.values()];
  const track=carousel.querySelector('#bulletinList');
  const offset=track.scrollLeft;
  track.innerHTML=stories.map(story=>`<li class="bulletin-story">
    <a class="bulletin-story-link" href="${escapeHTML(story.url)}" target="_blank" rel="noopener noreferrer">
      ${story.image?`<img class="bulletin-photo" src="${story.image}" alt="" loading="lazy" decoding="async">`:
        `<span class="bulletin-photo bulletin-photo-placeholder" aria-hidden="true"><img src="assets/sicep-symbol.png" alt=""></span>`}
      <span class="bulletin-topic">${escapeHTML(story.topic||'Protección Civil')}</span>
      <h3>${escapeHTML(story.title)}</h3>
      <span class="bulletin-date">${escapeHTML(story.published)}</span>
    </a>
  </li>`).join('');
  track.scrollLeft=offset;
  carousel.querySelector('.bulletin-navigation').hidden=stories.length<2;
}

app.addEventListener('click',event=>{
  const button=event.target.closest('button[data-bulletin-step]');
  if(!button)return;
  const track=button.closest('.bulletin-carousel').querySelector('.bulletin-track');
  const [first,second]=track.children;
  if(!second)return;
  const step=Number(button.dataset.bulletinStep);
  const end=track.scrollWidth-track.clientWidth;
  let left=track.scrollLeft+step*(second.offsetLeft-first.offsetLeft);
  if(step>0&&track.scrollLeft>=end-1)left=0;
  if(step<0&&track.scrollLeft<=1)left=end;
  track.scrollTo({left,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
});

function applySectionVisual(content,page,section){
  const artwork=page==='planes'&&Object.hasOwn(planArtwork,section)?planArtwork[section]:null;
  if(!artwork&&page!=='refugios')return content;
  return content.replace(/<h1>(.*?)<\/h1>/s,(_,title)=>
    `<div class="section-visual${artwork?' section-visual-photo':''}">
      <h1>${title}</h1>
      ${artwork?`<img src="assets/${artwork.image}" alt="">`:
        `<a class="btn shelter-routes" href="#rutas">${icon('rutas')} Ver rutas</a>`}
    </div>`);
}
function render(){if(routeMapInstance){routeMapInstance.remove();routeMapInstance=null;routeMapLayers=null}let [page,id]=(location.hash.slice(1)||'inicio').split('/');monitoringRequest?.abort();
if(riskMapInstance){
  riskMapView=page==='mapa'?{center:riskMapInstance.getCenter(),zoom:riskMapInstance.getZoom()}:null;
  riskMapInstance.remove();
  riskMapInstance=null;
}
const selectedPage=page==='detalle'||(page==='rutas'&&profile!=='brigada')?'refugios':page;
const ownedProfile=Object.hasOwn(pageProfile,page)?pageProfile[page]:
  Object.hasOwn(labels,selectedPage)&&!Object.hasOwn(profiles[profile].pages,selectedPage)?'ciudadania':null;
if(ownedProfile&&ownedProfile!==profile)setProfile(ownedProfile);
profilePicker.value=profile;
document.querySelector('.brand').setAttribute('href','#'+profiles[profile].start);
document.querySelector('#nav').innerHTML=Object.entries(profiles[profile].pages).map(([key,label])=>
  `<a href="#${key}"${key===selectedPage?' class="on" aria-current="page"':''}>${icon(profileIcons[key]||key)}${label}</a>`).join('');
const routeTown=ruralRouteTown();
if(ruralFilterPages.has(page)&&routeTown>=0&&routeTown!==town)changeMunicipality(routeTown);
let content;
switch(page){case 'inicio-coord':case 'inicio-brigada':content=roleHome();break;case 'refugios':content=shelters();break;case 'detalle':content=detail(Number(id));break;case 'coord':town=1;content=coordination();break;case 'brigada':content=brigadeView();break;case 'avisos':content=municipalNotices();break;case 'contactos':content=contacts();break;case 'mapa':content=riskMap();break;case 'rutas':content=routesPage();break;case 'planes':content=plans(id);break;case 'guia':content=back('inicio','Volver a Inicio')+preparation(id);break;default:page='inicio';content=home()}
if(['coord','brigada','inicio-coord','inicio-brigada'].includes(page)&&institutionalRequired){
  if(!operationalToken)content=operationalLogin();
  else if(operationalRole!==profile)content='<section class="card"><h1>Acceso restringido</h1><p>Este perfil requiere otra clave institucional.</p><button type="button" data-operator-signout>Cambiar de cuenta</button></section>';
  else content='<button type="button" class="route-refresh" data-operator-signout>Cerrar sesión institucional</button>'+content;
}
if(page==='avisos')content+=bulletinPanel();
app.innerHTML=['inicio','inicio-coord','inicio-brigada'].includes(page)?content:'<div class="sheet">'+applySectionVisual(content,page,id)+'</div>';if(page==='guia'){renderPlanHeader()}paintBulletins();document.title=(page==='rutas'?'Rutas':profiles[profile].pages[selectedPage]||'Protección civil')+' · SICEP Puebla';if(ruralFilterPages.has(page))loadRuralCatalog();if(page==='mapa')initializeRiskMap();if(page==='rutas'&&ruralRouteTown()>=0&&!ruralLocality()){initializeRouteMap();if(roadMode==='cargando')refreshRoadReports()}}
function changeMunicipality(value){
  town=value;
  zoom=1;
  routeDestination=null;
  routeOrigin=[...townCenters[town]];
  routeReportPoint=null;
  routeResult=null;
}
const gatedPlanButtons='[data-add-person],[data-add-pet],[data-remove-person],[data-remove-pet],[data-vault-destroy]';
const gatedPlanForms='#person-form,#pet-form,#family-plan-form,#vault-create-form,#vault-custom-form,#vault-note-form';
app.addEventListener('click',event=>{
  const button=event.target.closest('[data-contact-scroll]');
  if(!button)return;
  const track=document.getElementById(button.getAttribute('aria-controls'));
  const cards=[...track.children];
  const step=cards[1].offsetLeft-cards[0].offsetLeft;
  const index=Math.round(track.scrollLeft/step)+Number(button.dataset.contactScroll);
  track.scrollTo({left:Math.max(0,index)*step,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
});
app.addEventListener('click',event=>{
  const target=event.target;
  if(target.closest('[data-plan-access]')){
    requestPlanEdit();
    return;
  }
  if(target.closest('[data-plan-signout]')){
    planSession=null;
    vaultOpen=false;
    vaultKey=null;
    vaultData=null;
    render();
    return;
  }
  if(planSession)return;
  const button=target.closest(gatedPlanButtons);
  const field=target.closest('#family-plan-form input,#family-plan-form textarea,#vault-note');
  const checkbox=target.closest('[data-supply],[data-vault-item]');
  if(!button&&!field&&!checkbox)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  requestPlanEdit(()=>{if(field)field.focus();else (button||checkbox).click()});
},true);
app.addEventListener('beforeinput',event=>{
  if(planSession||!event.target.closest('#family-plan-form input,#family-plan-form textarea,#vault-note'))return;
  event.preventDefault();
  requestPlanEdit(()=>event.target.focus());
},true);
app.addEventListener('submit',event=>{
  if(planSession||!event.target.matches(gatedPlanForms))return;
  event.preventDefault();
  event.stopImmediatePropagation();
  requestPlanEdit(()=>event.target.requestSubmit());
},true);
app.addEventListener('input',event=>{
  if(event.target.id!=='shelter-query')return;
  shelterQuery=event.target.value;
  refreshShelterResults();
});
app.addEventListener('change',event=>{
  const {id,value}=event.target;
  if(id==='municipal-topic'){
    municipalTopic=value;
    render();
    document.querySelector('#municipal-topic')?.focus({preventScroll:true});
    return;
  }
  if(id==='rural-municipality'||id==='rural-locality'){
    selectRuralLocation(id==='rural-municipality'?value:ruralMunicipalityCode,id==='rural-locality'?value:'');
    document.querySelector('#'+id)?.focus({preventScroll:true});
    return;
  }
  if(id==='shelter-map-point'){
    shelterMapId=Number(value);
  }else if(id==='shelter-status'){
    shelterStatus=value;
  }else{return}
  refreshShelterResults();
  if(id==='shelter-map-point')document.querySelector('#shelter-map-point').focus();
});
app.addEventListener('change',e=>{if(e.target.id==='route-destination'){routeDestination=Number(e.target.value);render()}});
app.addEventListener('change',e=>{
  if(e.target.dataset.supply!==undefined){const index=Number(e.target.dataset.supply);suppliesChecked=e.target.checked?[...new Set([...suppliesChecked,index])]:suppliesChecked.filter(i=>i!==index);try{localStorage.setItem('sicep.supplies.v1',JSON.stringify(suppliesChecked))}catch{}const status=document.querySelector('#supplies-progress');if(status)status.textContent=suppliesChecked.length+' de '+supplyItems.length+' artículos marcados';return}
  if(e.target.dataset.prep===undefined)return;
  const index=Number(e.target.dataset.prep);
  prepared=e.target.checked?[...new Set([...prepared,index])]:prepared.filter(i=>i!==index);
  const status=document.querySelector('#prep-status');
  status.textContent=prepared.length+' de '+checklist.length+' tareas completadas';
  document.querySelector('progress').value=prepared.length;
  try{localStorage.setItem('sicep.prepared',JSON.stringify(prepared))}
  catch{status.textContent+=' · El navegador no pudo guardar el avance.'}
});
app.addEventListener('submit',async e=>{e.preventDefault();
  if(e.target.id==='operational-login'){
    const token=String(new FormData(e.target).get('token')).trim();
    const error=e.target.querySelector('[role=alert]');
    try{
      const response=await fetch('/api/situation?session',{headers:{Authorization:'Bearer '+token}});
      if(!response.ok)throw Error();
      const account=await response.json();
      if(!['brigada','coordinacion'].includes(account.role))throw Error();
      operationalToken=token;
      operationalRole=account.role;
      operatorKey=JSON.stringify([account.role,account.brigade||'',account.name]);
      try{sessionStorage.setItem(operatorSessionKey,JSON.stringify({token,role:account.role,key:operatorKey}))}catch{}
      setProfile(account.role);
      location.hash=account.role==='brigada'?'#brigada':'#coord';
      await sync();
      render();
    }catch{error.textContent='La clave no es válida o el servicio no está disponible.'}
    return;
  }
  if(e.target.id==='verify-resources'||e.target.id==='validate-case'){
    const data=new FormData(e.target);
    const operation=e.target.id==='verify-resources'?
      {type:'resources',capacity:Number(data.get('capacity')),open:data.has('open'),access:data.has('access'),available:data.getAll('available')}:
      {type:'validate',result:data.get('result'),note:String(data.get('note')).trim()};
    update(incident.stage,incident.count,null,null,null,null,operation);
    return;
  }
  if(e.target.id==='attention-form'){
  const data=new FormData(e.target),status=String(data.get('status')),note=String(data.get('note')).trim();
  if(incident?.stage===3&&attentionStates.includes(status)&&note)update(3,incident.count,null,null,null,{status,note,fromBrigade:profile==='brigada',...(profile==='brigada'?{id:crypto.randomUUID()}:{})});
  return;
}if(e.target.id==='case-radio-form'){
  const text=String(new FormData(e.target).get('message')||'').trim();
  if(text&&incident?.stage===3)update(3,incident.count,null,null,{id:crypto.randomUUID(),text,type:String(new FormData(e.target).get('type')),reference:String(new FormData(e.target).get('reference')||'')});
  return;
}if(e.target.id==='person-form'||e.target.id==='pet-form'){const data=new FormData(e.target),item=Object.fromEntries(data.entries());if(e.target.id==='person-form')household.people.push(item);else household.pets.push(item);try{localStorage.setItem(homeStore,JSON.stringify(household))}catch{alert('No se pudo guardar en este dispositivo. Libera espacio e inténtalo de nuevo.');return}render();return}if(e.target.id==='route-report-form'){submitRoadReport(e.target);return}if(e.target.id==='assignment'){const data=new FormData(e.target);update(2,incident?.count||35,null,{shelter:String(data.get('shelter')),brigade:String(data.get('brigade'))});return}if(e.target.id==='report'){const data=new FormData(e.target),details={locality:String(data.get('locality')||''),reportedAt:new Date(String(data.get('reportedAt'))).toISOString(),source:String(data.get('source')||''),impact:String(data.get('impact')||''),need:String(data.get('need')||''),verification:String(data.get('verification')||'')};coordEditing=false;update(1,Number(data.get('count')),details);return}update(1,Number(new FormData(e.target).get('count')))});
app.addEventListener('click',async event=>{
  const button=event.target.closest('button');
  if(!button)return;
  if(button.hasAttribute('data-operator-signout')){
    clearOperatorSession();
    incident=null;caseDirectory=[];caseId=1;revision='';
    ++caseSyncVersion;
    render();
    return;
  }
  if(button.dataset.coordSection){
    coordinationSection=button.dataset.coordSection;
    render();
    app.querySelector(`[data-coord-section="${coordinationSection}"]`)?.focus();
    return;
  }
  if(button.dataset.openCase){selectCase(Number(button.dataset.openCase));return}
  if(button.hasAttribute('data-retry-case-sync')){await sync();render();return}
  if(button.dataset.caseOperation){
    update(incident.stage,incident.count,null,null,null,null,{type:button.dataset.caseOperation});
    return;
  }
  if(!button.hasAttribute('data-new-case'))return;
  button.disabled=true;
  try{
    const response=await operationalFetch('/api/situation?new',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(button.dataset.parentCase?{parentId:Number(button.dataset.parentCase)}:{})});
    if(!response.ok)throw Error();
    const {id}=await response.json();
    selectCase(id);
  }catch{alert('No se pudo abrir un nuevo folio. Revisa la conexión.')}
  finally{button.disabled=false}
});
app.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-retry-rural')){ruralCatalogStatus='idle';loadRuralCatalog();return}if(b.dataset.radioAck){if(incident?.stage===3)update(3,incident.count,null,null,{id:b.dataset.radioAck});return}if(b.hasAttribute('data-add-person')){document.querySelector('#person-dialog')?.showModal();return}if(b.hasAttribute('data-add-pet')){document.querySelector('#pet-dialog')?.showModal();return}if(b.hasAttribute('data-close-dialog')){b.closest('dialog')?.close();return}if(b.dataset.removePerson!==undefined||b.dataset.removePet!==undefined){const people=b.dataset.removePerson!==undefined,index=Number(people?b.dataset.removePerson:b.dataset.removePet),items=people?household.people:household.pets;if(Number.isInteger(index)&&confirm(`¿Quitar ${items[index]?.name||'este registro'} del hogar?`)){items.splice(index,1);localStorage.setItem(homeStore,JSON.stringify(household));render()}return}if(b.hasAttribute('data-case-edit')){coordEditing=true;render();return}if(b.hasAttribute('data-case-cancel')){coordEditing=false;render();return}if(b.hasAttribute('data-support-request')){const details={...caseDetails(),supportRequested:true};update(1,incident?.count||35,details);return}if(b.dataset.refreshRoutes!==undefined)refreshRoadReports();if(b.dataset.routeMode){routeMapMode=b.dataset.routeMode;if(routeMapMode==='origin')routeReportPoint=null;render();if(routeMapMode==='report')setTimeout(()=>document.querySelector('#route-real-map')?.scrollIntoView({behavior:'smooth',block:'center'}),100)}if(b.hasAttribute('data-route-location')){if(!navigator.geolocation){alert('Este navegador no permite compartir ubicación.');return}navigator.geolocation.getCurrentPosition(position=>{routeOrigin=[position.coords.latitude,position.coords.longitude];routeMapMode='origin';render()},()=>alert('No se pudo obtener la ubicación. Puedes marcar la salida tocando el mapa.'),{enableHighAccuracy:true,timeout:10000,maximumAge:60000})}if(b.hasAttribute('data-refresh-monitoring')){render();return}if(b.dataset.layer){hazardLayer=b.dataset.layer;riskMapInstance?.remove();riskMapInstance=null;riskMapView=null;render()}if(b.dataset.clearShelters!==undefined){shelterQuery='';shelterStatus='';ruralLocalityCode='';render();document.querySelector('#shelter-query').focus()}if(b.dataset.mode){mode=b.dataset.mode;render();document.querySelector('[data-mode="'+mode+'"]').focus()}if(b.dataset.zoom){zoom=Math.min(1.6,Math.max(1,zoom+Number(b.dataset.zoom)*.2));render()}if(b.dataset.step){let stage=Number(b.dataset.step);update(stage,incident?.count||35)}});
app.addEventListener('submit',async e=>{const form=e.target;if(!['family-plan-form','vault-create-form','vault-open-form','vault-custom-form','vault-note-form'].includes(form.id))return;e.preventDefault();e.stopImmediatePropagation();if(form.id==='family-plan-form'){familyPlan=Object.fromEntries(new FormData(form).entries());try{localStorage.setItem(planStore,JSON.stringify(familyPlan));document.querySelector('#plan-status').textContent='Plan guardado en este dispositivo.'}catch{document.querySelector('#plan-status').textContent='No se pudo guardar; libera espacio e inténtalo de nuevo.'}return}if(form.id==='vault-note-form'){vaultData.note=String(new FormData(form).get('note')||'');if(await saveVault()){vaultOpen=false;vaultKey=null;vaultData=null;render()}return}if(form.id==='vault-create-form'){const data=new FormData(form),password=String(data.get('password')||'');if(password!==String(data.get('confirm')||'')){const error=document.createElement('p');error.className='vault-error';error.setAttribute('role','alert');error.textContent='Las contraseñas no coinciden.';form.querySelector('button[type=submit]').before(error);return}try{const salt=crypto.getRandomValues(new Uint8Array(16)),key=await deriveVaultKey(password,salt),payload={checked:[],custom:[],note:'',hint:String(data.get('hint')||'').trim()},record=await encryptVault(payload,key,salt);localStorage.setItem(vaultStore,JSON.stringify(record));vaultRecord=record;vaultData=payload;vaultKey=key;vaultOpen=true;vaultMessage='';render()}catch{vaultMessage='No se pudo crear la bóveda en este navegador.';render()}return}if(form.id==='vault-open-form'){const password=String(new FormData(form).get('password')||'');try{const opened=await decryptVault(vaultRecord,password);vaultData=opened.data;vaultKey=opened.key;vaultOpen=true;vaultMessage='';render()}catch{vaultMessage='No se pudo abrir. Revisa la contraseña e inténtalo otra vez.';render()}return}const name=String(new FormData(form).get('name')||'').trim();if(!name)return;vaultData.custom.push(name);if(await saveVault())render()},true);
app.addEventListener('change',async e=>{if(e.target.dataset.vaultItem===undefined)return;e.stopImmediatePropagation();const index=Number(e.target.dataset.vaultItem),checked=new Set(vaultData.checked||[]);if(e.target.checked)checked.add(index);else checked.delete(index);vaultData.checked=[...checked];await saveVault()},true);
app.addEventListener('click',e=>{const destroy=e.target.closest('[data-vault-destroy]'),lock=e.target.closest('[data-vault-lock]');if(!destroy&&!lock)return;e.preventDefault();e.stopImmediatePropagation();if(destroy){if(!confirm('¿Destruir la bóveda y borrar definitivamente las notas y marcas guardadas?'))return;localStorage.removeItem(vaultStore);vaultRecord=null;vaultMessage=''}vaultOpen=false;vaultKey=null;vaultData=null;render()},true);
window.addEventListener('hashchange',()=>{const [page,id]=(location.hash.slice(1)||'inicio').split('/');if(page!=='guia'||id!=='documentos'){vaultOpen=false;vaultKey=null;vaultData=null}render();scrollTo(0,0)});render();

if(hosted&&'serviceWorker' in navigator)navigator.serviceWorker.register('/offline.js').catch(()=>{});
sync();if(hosted)setInterval(()=>{if(!document.hidden){sync();if(location.hash==='#rutas')refreshRoadReports()}},15000);

const fallbackBulletins={
  "items": [
    {
      "title": "Protección Civil Estatal rescata a dos alpinistas lesionadas en el Citlaltépetl",
      "url": "https://www.puebla.gob.mx/index.php/noticias/item/25939-proteccion-civil-estatal-rescata-a-dos-alpinistas-lesionadas-en-el-citlaltepetl",
      "published": "23 de Noviembre de 2026"
    }
  ],
  "checked": "2026-11-25T00:47:57.868Z"
};
async function loadBulletins(){try{if(!hosted)throw Error();const r=await fetch('/api/boletines');if(!r.ok)throw Error();bulletinData=await r.json()}catch{bulletinData={...fallbackBulletins,saved:true}}paintBulletins()}
loadBulletins();
