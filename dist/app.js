const paths={inicio:'M3 10 12 3l9 7v11h-6v-7H9v7H3z',avisos:'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4z M10 20h4',refugios:'M12 22s8-9 8-14a8 8 0 1 0-16 0c0 5 8 14 8 14z M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',contactos:'M5 3h4l2 5-3 2q2 5 6 6l2-3 5 2v4q0 3-4 2Q4 18 3 6z',guia:'M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1z M12 6v14',coord:'M4 5h16v16H4z M8 9h8 M8 13h8 M8 17h5'};
paths.mapa=paths.refugios;paths.planes=paths.guia;
const icon=k=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="'+paths[k]+'"/></svg>';
const labels={inicio:'Inicio',avisos:'Avisos',refugios:'Refugios',guia:'Mi plan',contactos:'Contactos'};
const towns=['San Pedro Cholula','Atempan'];
const places=[
['Refugio temporal de Cholula','Av. 14 Poniente 307, Centro',0,'Abierto','Rampa de entrada y sanitarios accesibles.'],
['Refugio Deportivo Santiago','Calle 9 Norte s/n, Barrio de Santiago',0,'Abierto','Accesibilidad pendiente de confirmar.'],
['Auditorio Municipal','Palacio Municipal',1,'Abierto','Acceso verificado en el ejercicio. Capacidad nominal de 500 personas.'],
['Esc. 1º de enero','2 Sur y 3 Oriente',1,'Acceso bloqueado','Capacidad nominal de 300 personas.'],
['Esc. Manuel Acuña Hernández','Av. Benito Juárez 147, Tacopan',1,'Sin confirmar','Capacidad nominal de 250 personas.']];
let town=1,mode='mapa',zoom=1,incident=null;
let revision='',connection='Cargando registro municipal…';
const hosted=location.protocol!=='file:';
async function sync(){
  if(!hosted){try{incident=JSON.parse(localStorage.getItem('sicep.demo.v1')||'{"stage":1,"count":35}')}catch{}connection='Ejercicio local';render();return}
  try{
    const r=await fetch('/api/situation',{cache:'no-store'});
    if(!r.ok)throw Error();
    const data=await r.json();
    const changed=revision!==data.updated || connection!=='Registro municipal compartido';
    revision=data.updated;incident=data;connection='Registro municipal compartido';
    if(changed)render();
  }catch{connection='Registro municipal sin conexión';render()}
}
async function update(stage,count){
  if(!hosted){incident={stage,count,updated:new Date().toISOString()};localStorage.setItem('sicep.demo.v1',JSON.stringify(incident));render();return}
  try{
    const r=await fetch('/api/situation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage,count,revision})});
    if(!r.ok){if(r.status===409)await sync();throw Error()}
    incident=await r.json();revision=incident.updated;render();
  }catch{alert('El cambio no se guardó. Revisa el estado del registro y vuelve a intentar.')}
}
const app=document.querySelector('#app');
const select=()=>'<label>Municipio<select id="town">'+towns.map((t,i)=>'<option value="'+i+'" '+(i===town?'selected':'')+'>'+t+'</option>').join('')+'</select></label>';
const tile=(k,title,sub)=>'<a class="tile" href="#'+k+'"><span class="icon">'+icon(k)+'</span><div><b>'+title+'</b><span class="muted">'+sub+'</span></div><span class="chev">›</span></a>';
const back=(k='inicio',label='Inicio')=>'<a class="link back" href="#'+k+'">‹ '+label+'</a>';
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
function preparation(){
  const count = new Set(prepared).size;
  return `${back()}<h1>Mi plan de emergencia</h1><p>Marca las tareas completadas. Tu avance se guarda en este navegador.</p>
  <section class="card"><h2>Lista de preparación</h2><p id="prep-status" role="status">${count} de ${checklist.length} tareas completadas</p>
  <progress aria-label="Avance de preparación" max="${checklist.length}" value="${count}"></progress>
  ${checklist.map((item,i)=>`<label class="check"><input type="checkbox" data-prep="${i}" ${prepared.includes(i)?'checked':''}> ${item}</label>`).join('')}</section>
  <a class="link" href="#refugios">Consultar refugios de ${towns[town]}</a>`;
}
const planTopics = [
  ['lluvias','⛈','Emergencias hidrometeorológicas'],
  ['sismos','⌂','Plan operativo de sismos'],
  ['incendios','♨','Contingencias de incendios'],
  ['invierno','❄','Emergencias de temporada invernal'],
  ['volcan','△','Plan Popocatépetl'],
  ['peregrinaciones','♧','Protección y seguridad en peregrinaciones'],
  ['pirotecnia','✧','Programa especial de pirotecnia']
];
function plans(id){
  const plan = planTopics.find(topic=>topic[0]===id);
  if(plan)return `${back('planes','Planes de Protección Civil')}<span class="icon" aria-hidden="true">${plan[1]}</span><h1>${plan[2]}</h1><section class="card"><p>Documento oficial pendiente de incorporar.</p><a class="link" href="#guia">Abrir mi plan de emergencia</a></section>`;
  return `${back()}<h1>Planes de Protección Civil</h1><div class="tiles">${planTopics.map(([key,symbol,title])=>`<a class="tile" href="#planes/${key}"><span class="icon" aria-hidden="true">${symbol}</span><b>${title}</b><span class="chev" aria-hidden="true">›</span></a>`).join('')}</div>`;
}
const emergencyNumbers=[
  ['911','Emergencias y auxilio','Policía, bomberos y atención médica urgente.'],
  ['089','Denuncia anónima','Reportes anónimos de posibles delitos.'],
  ['800 581 44 44','Centro de Atención Telefónica de Puebla','Atención telefónica estatal.']
];
function contacts(){
  return `${back()}<h1>Números de emergencia y atención</h1><div class="stack">${emergencyNumbers.map(([number,title,description])=>`<section class="card"><h2>${title}</h2><p>${description}</p><a class="btn" href="tel:${number.replaceAll(' ','')}">${icon('contactos')} Llamar al ${number}</a></section>`).join('')}</div><p class="muted">Fuente: Secretaría de Salud del Estado de Puebla.</p>`;
}
function riskMap(){
  const boxes=['-98.34,19.03,-98.27,19.09','-97.49,19.79,-97.40,19.88'];
  const [west,south,east,north]=boxes[town].split(',').map(Number);
  const bounds=encodeURIComponent(boxes[town]);
  const marker=encodeURIComponent(`${(south+north)/2},${(west+east)/2}`);
  return `${back()}<h1>Mapa municipal</h1>${select()}<section class="card map-card"><iframe title="Mapa de ${towns[town]} en OpenStreetMap" src="https://www.openstreetmap.org/export/embed.html?bbox=${bounds}&amp;layer=mapnik&amp;marker=${marker}"></iframe><p class="muted">Marcador de referencia del área mostrada. Los refugios y avisos de demostración se consultan por municipio.</p></section>`;
}

const actionCards = {
  avisos: ['Consultar avisos', 'Boletines oficiales y avisos municipales'],
  refugios: ['Buscar refugios', 'Direcciones y disponibilidad del ejercicio'],
  mapa: ['Explorar mapa municipal', 'Ubica el municipio seleccionado'],
  planes: ['Planes de Protección Civil', 'Consulta por tipo de emergencia'],
  contactos: ['Números de atención', 'Emergencias y denuncia anónima'],
  guia: ['Preparar a mi familia', 'Completa tu lista de preparación'],
  coord: ['Coordinación municipal', 'Consulta el expediente y las tareas de brigada']
};
const actionsByPage = {
  inicio: ['avisos','refugios','mapa','planes','contactos','guia'],
  avisos: ['mapa','refugios','planes'],
  refugios: ['mapa','avisos','contactos'],
  detalle: ['refugios','mapa','contactos'],
  guia: ['planes','refugios','contactos'],
  contactos: ['avisos','refugios','guia'],
  mapa: ['avisos','refugios','contactos'],
  planes: ['guia','avisos','refugios'],
  coord: ['refugios','mapa','avisos']
};
function actionPanel(page='inicio'){
  const actions=actionsByPage[page].map(key=>tile(key,...actionCards[key])).join('');
  const call=page==='contactos'?'':`<a class="btn" href="tel:911">${icon('contactos')} Llamar al 911</a>`;
  return `<section class="action-panel" aria-labelledby="quick-actions"><div class="action-heading"><h2 id="quick-actions">Acciones rápidas</h2>${call}</div><div class="tiles">${actions}</div></section>`;
}

function home(){
  const local=town===1, stage=incident?.stage||0;
  const active=local&&stage>0;
  const available=40-(stage>=2?incident.count:0);
  const rows=places.map((p,i)=>p[2]===town?`<a class="shelterLine" href="#detalle/${i}"><span><b>${p[0]}</b><small>${i===2&&incident?available+' lugares disponibles':'Cupo pendiente de confirmar'}</small></span>${pill(p[3])}</a>`:'').join('');
  const stamp=t=>t?new Intl.DateTimeFormat('es-MX',{dateStyle:'short',timeStyle:'short',timeZone:'America/Mexico_City'}).format(new Date(t)):'';
  return `<section class="hero"><article><small>Protección civil · Demostración</small><h1>Centro de información de Puebla</h1><p>Avisos, reportes municipales y refugios reunidos por territorio.</p></article><img src="assets/cholula.png" alt="Paisaje ilustrado de Cholula"></section>
  ${actionPanel()}<div class="scope"><div><small>Panorama municipal</small><h2>Situación en ${towns[town]}</h2></div>${select()}</div>
  <div class="stats"><a href="#avisos"><b>1</b> aviso municipal</a><a href="#refugios"><b>${places.filter(p=>p[2]===town&&p[3]==='Abierto').length}</b> refugios abiertos</a><span><b>${active?incident.count:local&&!incident?'—':0}</b> personas reportadas</span></div>
  <div class="grid"><section class="card"><small>Mesa municipal · ${connection}</small><h2>Seguimiento del incidente</h2>${active?`<span class="pill neutral">SICEP-AT-001</span><h3>Inundación · ${incident.count} personas</h3><p>${stageName[stage]}</p><ol><li>Municipio · Solicitud de alojamiento registrada.</li>${stage>=2?`<li>Coordinación · ${incident.count} lugares asignados en el Auditorio Municipal. ${stamp(incident.assigned)}</li>`:''}${stage>=3?`<li>Brigada · Recepción de la asignación confirmada. ${stamp(incident.received)}</li>`:''}</ol><a class="link" href="#coord">Abrir expediente y tareas de brigada</a>`:`<p>${local&&!incident?connection:'Sin solicitudes de alojamiento registradas en este municipio.'}</p>${local?'<a class="link" href="#coord">Registrar incidente</a>':''}`}</section>
  <section class="card notice"><small>Aviso municipal · Simulación</small><h2>${alerts[town][0]}</h2><p>${alerts[town][1]}</p><a class="link" href="#avisos">Ver boletín y fuente</a></section></div>
  <section class="card"><small>Catálogo y reporte de campo</small><h2>Disponibilidad de refugios</h2>${rows}<a class="link" href="#refugios">Consultar directorio y mapa</a></section>
  <div class="tiles">${tile('contactos','Contactos','Directorio de emergencia')}${tile('coord','Coordinación','Mesa municipal de Atempan')}</div>`;
}
function shelters(){let rows=places.map((p,i)=>p[2]===town?'<a class="row" href="#detalle/'+i+'"><span class="icon">'+icon('inicio')+'</span><div><b>'+p[0]+'</b><span class="muted">'+p[1]+'</span></div><span style="margin-left:auto">'+pill(p[3])+'</span></a>':'').join('');
return back()+'<small style="display:block">Directorio de demostración</small><h1>Refugios temporales</h1>'+select()+'<div class="segment">'+['mapa','lista'].map(m=>'<button data-mode="'+m+'" aria-pressed="'+(m===mode)+'">'+(m==='mapa'?'Mapa':'Lista')+'</button>').join('')+'</div>'+(mode==='mapa'?(town===0?'<div class="map"><div class="mapinner" style="transform:scale('+zoom+')">'+[[0,54,10],[1,17,46]].map(([i,x,y])=>'<a class="pin" href="#detalle/'+i+'" aria-label="'+places[i][0]+'" style="left:'+x+'%;top:'+y+'%"></a>').join('')+'</div><div class="zoom"><button data-zoom="1" aria-label="Acercar">+</button><button data-zoom="-1" aria-label="Alejar">−</button></div></div><span class="muted">Mapa ilustrativo · Selecciona un refugio.</span>':'<p class="card">Ubicaciones pendientes de verificar. Consulta las direcciones del directorio.</p>'):'')+'<h2 style="margin-top:16px">'+(town===0?2:3)+' refugios en '+towns[town]+'</h2><div class="stack">'+rows+'</div>'}
function detail(id){let p=places[id];if(!p)return shelters();town=p[2];return back('refugios','Refugios')+'<div>'+pill(p[3])+'</div><h1>'+p[0]+'</h1><div class="card"><h3>Dirección</h3><p>'+p[1]+', '+towns[town]+', Puebla.</p><h3>Acceso y capacidad</h3><p>'+p[4]+(id===2?' Cupo del ejercicio: '+(40-(incident?.stage>=2?incident.count:0))+'.':'')+'</p><h3>Última actualización</h3><p>Registro de demostración.</p></div><a class="btn" href="https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(p[1]+', '+towns[town]+', Puebla, México')+'" target="_blank" rel="noopener">Cómo llegar · Google Maps</a><p class="muted">Dirección de ejemplo. Verifica la ubicación antes de trasladarte.</p>'}
const source='<a class="link" target="_blank" rel="noopener" href="https://proteccioncivil.puebla.gob.mx/">Protección Civil del Estado de Puebla</a>';
function coordination(){let stage=incident?.stage||0;return back()+'<small style="display:block">Simulación municipal · Atempan</small><h1>Coordinación de brigadas</h1><p>Practica la atención de una inundación. '+connection+'.</p><div class="card">'+(!stage?'<form id="report"><h2>Registrar incidente</h2><p>Inundación en Atempan</p><label>Personas que necesitan alojamiento<input type="number" name="count" min="1" max="9999" value="35" required></label><button>Registrar y revisar propuesta</button></form>':'<small>Folio SICEP-AT-001</small><h2>Inundación en Atempan</h2><p>'+incident.count+' personas requieren alojamiento.</p>'+(stage===1?(incident.count<=40?'<h3>Propuesta · Auditorio Municipal</h3><p>El acceso está verificado y los 40 lugares del ejercicio cubren la solicitud. Los otros refugios tienen acceso bloqueado o pendiente de confirmar.</p><button data-step="2">Confirmar asignación a brigada</button>':'<p>Los 40 lugares disponibles son insuficientes. Se requiere coordinación adicional.</p>'):stage===2?'<h3>Asignación confirmada</h3><p>Brigada municipal: recibe la asignación al Auditorio Municipal para '+incident.count+' personas.</p><button data-step="3">Acusar recibo como brigada</button>':'<h3>Brigada enterada</h3><p>Acuse registrado para el Auditorio Municipal.</p>')+'<p><button class="segment" data-step="0">Reiniciar ejercicio</button></p>')+'</div>'}
let bulletinData=null;
function bulletinPanel(){
  return '<section class="card" id="bulletins"><small>Gobierno del Estado de Puebla</small><h2>Boletines estatales de protección civil</h2><div id="bulletinList"></div><a class="link" href="https://www.puebla.gob.mx/index.php/noticias" target="_blank" rel="noopener">Ver portal de origen</a></section>';
}
function paintBulletins(){
  const list=document.querySelector('#bulletinList');
  if(!list)return;
  list.replaceChildren();
  const status=document.createElement('p');
  status.className='muted';
  status.textContent=bulletinData ? (bulletinData.saved?'Copia guardada · ':'Consulta del portal · ')+new Date(bulletinData.checked).toLocaleString('es-MX',{timeZone:'America/Mexico_City'})+' (hora de Puebla)' : 'Consultando fuente estatal…';
  list.append(status);
  for(const item of bulletinData?.items||[]){
    const link=document.createElement('a');
    link.className='shelterLine';link.href=item.url;link.target='_blank';link.rel='noopener';
    link.textContent=item.published+' · '+item.title;list.append(link);
  }
  if(bulletinData && !bulletinData.items.length)list.append('Sin coincidencias en la portada consultada. ');
}
function render(){let [page,id]=(location.hash.slice(1)||'inicio').split('/');document.querySelector('#nav').innerHTML=Object.entries(labels).map(([k,v])=>'<a class="'+(k===(page==='detalle'?'refugios':page)?'on':'')+'" href="#'+k+'">'+icon(k)+v+'</a>').join('');let content;
switch(page){case 'refugios':content=shelters();break;case 'detalle':content=detail(Number(id));break;case 'coord':town=1;content=coordination();break;case 'avisos':content=back()+'<h1>Avisos municipales</h1>'+select()+'<section class="card notice"><small>'+alerts[town][2]+'</small><h2>'+alerts[town][0]+'</h2><p>'+alerts[town][1]+'</p><p>Consulta la información oficial vigente en el portal estatal.</p>'+source+'</section><a class="link" href="#refugios">Ver refugios de '+towns[town]+'</a>';break;case 'contactos':content=contacts();break;case 'mapa':content=riskMap();break;case 'planes':content=plans(id);break;case 'guia':content=preparation();break;default:page='inicio';content=home()}
if(page==='inicio')content+=bulletinPanel();
if(page==='avisos')content+=bulletinPanel();
if(page!=='inicio')content+=actionPanel(page);
app.innerHTML=page==='inicio'?content:'<div class="sheet">'+content+'</div>';paintBulletins();document.title=(labels[page]||'Protección civil')+' · SICEP Puebla'}
app.addEventListener('change',e=>{if(e.target.id==='town'){town=Number(e.target.value);zoom=1;render()}});
app.addEventListener('change',e=>{
  if(e.target.dataset.prep===undefined)return;
  const index=Number(e.target.dataset.prep);
  prepared=e.target.checked?[...new Set([...prepared,index])]:prepared.filter(i=>i!==index);
  const status=document.querySelector('#prep-status');
  status.textContent=prepared.length+' de '+checklist.length+' tareas completadas';
  document.querySelector('progress').value=prepared.length;
  try{localStorage.setItem('sicep.prepared',JSON.stringify(prepared))}
  catch{status.textContent+=' · El navegador no pudo guardar el avance.'}
});
app.addEventListener('submit',e=>{e.preventDefault();update(1,Number(new FormData(e.target).get('count')))});
app.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.mode){mode=b.dataset.mode;render()}if(b.dataset.zoom){zoom=Math.min(1.6,Math.max(1,zoom+Number(b.dataset.zoom)*.2));render()}if(b.dataset.step){let stage=Number(b.dataset.step);update(stage,incident?.count||35)}});
window.addEventListener('hashchange',()=>{render();scrollTo(0,0)});render();

sync();if(hosted)setInterval(()=>{if(!document.hidden)sync()},15000);

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
