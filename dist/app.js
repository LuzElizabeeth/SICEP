const paths={inicio:'M3 10 12 3l9 7v11h-6v-7H9v7H3z',avisos:'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4z M10 20h4',refugios:'M12 22s8-9 8-14a8 8 0 1 0-16 0c0 5 8 14 8 14z M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',contactos:'M5 3h4l2 5-3 2q2 5 6 6l2-3 5 2v4q0 3-4 2Q4 18 3 6z',guia:'M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1z M12 6v14',coord:'M4 5h16v16H4z M8 9h8 M8 13h8 M8 17h5',rutas:'M4 20 9 5l6 14 5-12 M7 12h5 M14 15h5'};
paths.mapa=paths.refugios;paths.planes=paths.guia;
const icon=k=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="'+paths[k]+'"/></svg>';
const labels={inicio:'Inicio',avisos:'Avisos',mapa:'Mi ciudad',rutas:'Rutas',refugios:'Refugios',guia:'Mi plan',contactos:'Contactos'};
const towns=['San Pedro Cholula','Atempan'];
const places=[
['Refugio temporal de Cholula','Av. 14 Poniente 307, Centro',0,'Abierto','Rampa de entrada y sanitarios accesibles.'],
['Refugio Deportivo Santiago','Calle 9 Norte s/n, Barrio de Santiago',0,'Abierto','Accesibilidad pendiente de confirmar.'],
['Auditorio Municipal','Palacio Municipal',1,'Abierto','Acceso verificado en el ejercicio. Capacidad nominal de 500 personas.'],
['Esc. 1º de enero','2 Sur y 3 Oriente',1,'Acceso bloqueado','Capacidad nominal de 300 personas.'],
['Esc. Manuel Acuña Hernández','Av. Benito Juárez 147, Tacopan',1,'Sin confirmar','Capacidad nominal de 250 personas.']];
let town=1,mode='mapa',zoom=1,incident=null;
let hazardLayer='rain',selectedZone='Atempan';
let roadReports=[],roadBlocked=[],roadMode='cargando',roadLoading=false,routeDestination=null,routeOrigin=0,routeSelectedStreet=null,demoHazard=null;
let revision='',connection='Cargando registro municipal…';
const hosted=location.protocol!=='file:';
const corridorNames=[
  {rows:['Av. 14 Poniente','Calle 9 Norte','Blvd. Forjadores','Periférico Ecológico'],cols:['Recta a Cholula','Av. Morelos','Calle 5 de Mayo','Av. Miguel Alemán']},
  {rows:['Carretera Federal 129','Av. Benito Juárez','Camino a Tacopan','Camino a Tlatlauquitepec'],cols:['Acceso Norte','Calle del Centro','Acceso Sur','Camino a Teziutlán']}
];
const hazardLabels={derrumbe:'Derrumbe o deslave',socavon:'Socavón',inundacion:'Inundación o corriente',obstruccion:'Calle obstruida',otro:'Otro peligro'};
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function routeGraph(){
  const edges=[],nodes=Array.from({length:16},(_,i)=>({id:i,row:Math.floor(i/4),col:i%4,x:85+(i%4)*170,y:48+Math.floor(i/4)*105}));
  const prefix=town===0?'cholula':'atempan';
  for(let row=0;row<4;row++)for(let col=0;col<3;col++){const a=row*4+col,b=a+1;edges.push({id:prefix+'-h-'+row+'-'+col,a,b,street:corridorNames[town].rows[row],label:corridorNames[town].rows[row]+' · tramo '+(col+1),base:1})}
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){const a=row*4+col,b=a+4;edges.push({id:prefix+'-v-'+row+'-'+col,a,b,street:corridorNames[town].cols[col],label:corridorNames[town].cols[col]+' · tramo '+(row+1),base:1})}
  return {nodes,edges};
}
function shortestRoute(graph,start,goal,riskAware,risks){
  const distance=new Map(graph.nodes.map(n=>[n.id,Infinity])),previous=new Map(),pending=new Set(graph.nodes.map(n=>n.id));distance.set(start,0);
  while(pending.size){let current=null;for(const node of pending)if(current===null||distance.get(node)<distance.get(current))current=node;
    if(current===null||!Number.isFinite(distance.get(current))||current===goal)break;pending.delete(current);
    for(const edge of graph.edges){const next=edge.a===current?edge.b:edge.b===current?edge.a:null;if(next===null||!pending.has(next))continue;
      const risk=risks.get(edge.id);if(riskAware&&risk?.blocked)continue;
      const cost=edge.base+(riskAware&&risk?risk.penalty:0);
      if(distance.get(current)+cost<distance.get(next)){distance.set(next,distance.get(current)+cost);previous.set(next,{node:current,edge})}
    }
  }
  if(!Number.isFinite(distance.get(goal)))return null;
  const nodes=[goal],edges=[];let at=goal;
  while(at!==start){const step=previous.get(at);if(!step)return null;edges.unshift(step.edge);at=step.node;nodes.unshift(at)}
  return {nodes,edges,cost:distance.get(goal),km:edges.length*.25};
}
function localRoadReports(){try{const v=JSON.parse(localStorage.getItem('sicep.route-reports.v1')||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
async function refreshRoadReports(){
  if(roadLoading)return;
  roadLoading=true;let next,blocked,mode;
  try{
    if(!hosted)throw Error('local');
    const response=await fetch('/api/routes',{cache:'no-store'});
    if(!response.ok)throw Error('API no disponible');
    const data=await response.json();next=data.reports||[];blocked=data.blocked||[];mode='compartido';
  }catch{
    next=localRoadReports();blocked=[...new Set(next.filter(r=>(r.impact||'blocked')==='blocked').map(r=>r.town+':'+r.street))];mode='local';
  }
  roadLoading=false;
  const changed=JSON.stringify(roadReports)!==JSON.stringify(next)||JSON.stringify(roadBlocked)!==JSON.stringify(blocked)||roadMode!==mode;
  roadReports=next;roadBlocked=blocked;roadMode=mode;
  if(changed&&location.hash==='#rutas')render();
}
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
  <p class="guidance-intro">Guía práctica basada en el programa estatal para preparar a tu familia y actuar con información oficial.</p>
  <section class="volcano-dashboard" aria-labelledby="volcano-dashboard-title"><div class="volcano-dashboard-head"><div><small>Último reporte de CENAPRED · 24 de noviembre de 2026, 11:00 h</small><h2 id="volcano-dashboard-title">Monitoreo del Popocatépetl</h2></div><a class="link" href="https://www.cenapred.gob.mx/reportesVolcanesMX/Procesos?tipoProceso=detallesUltimoReporteVolcan" target="_blank" rel="noopener noreferrer">Abrir reporte ↗</a></div><div class="volcano-dashboard-grid"><section class="volcano-indicator"><h3>Semáforo de alerta volcánica</h3><strong class="volcano-level">AMARILLO · FASE 2</strong><div class="traffic-light" role="img" aria-label="Semáforo de alerta: amarillo, fase 2"><span class="traffic-lamp traffic-green"></span><span class="traffic-lamp traffic-yellow active"></span><span class="traffic-lamp traffic-red"></span></div></section><section class="volcano-indicator wind-indicator"><h3>Dirección del viento</h3><strong class="wind-direction">ESTE</strong><div class="compass" role="img" aria-label="Brújula señalando al Este"><span class="compass-n">N</span><span class="compass-e">E</span><span class="compass-s">S</span><span class="compass-w">O</span><span class="compass-arrow">➤</span></div></section></div><p class="volcano-report-note">Dato del reporte del 24 de noviembre; confirma en CENAPRED si ya se publicó uno más reciente.</p></section>
  <aside class="guidance-lead"><b>Consulta el nivel de alerta vigente con CENAPRED.</b><p>El semáforo puede cambiar. Esta guía no es un reporte en tiempo real ni sustituye una indicación de Protección Civil. Si se ordena evacuar, sigue la ruta indicada por las autoridades.</p><a class="link" href="https://www.cenapred.gob.mx/reportesVolcanesMX/Procesos?tipoProceso=detallesUltimoReporteVolcan" target="_blank" rel="noopener noreferrer">Ver monitoreo oficial del Popocatépetl ↗</a></aside>
  <div class="guidance-grid">
    <section class="guidance-card"><small>Conoce los peligros</small><h2>Riesgos contemplados</h2><ul><li>Caída de ceniza y acumulación en techos.</li><li>Emisión de fragmentos y flujos piroclásticos cerca del volcán.</li><li>Lahares: lodo y escombro que pueden bajar por barrancas y cauces, especialmente con lluvia.</li></ul></section>
    <section class="guidance-card"><small>Antes</small><h2>Prepárate en familia</h2><ul><li>Acuerda un punto de encuentro y quién ayudará a niñas, personas mayores o con movilidad limitada.</li><li>Ubica los puntos de reunión, rutas y refugios definidos por tu localidad.</li><li>Ten documentos importantes listos y prepara alimento y agua para tus animales.</li><li>Consulta avisos oficiales y evita compartir rumores.</li></ul></section>
    <section class="guidance-card"><small>Si cae ceniza</small><h2>Protege tu salud y tu hogar</h2><ul><li>Evita actividades al aire libre; si debes salir, cubre nariz, boca y ojos.</li><li>Cierra puertas y ventanas y cubre depósitos de agua, alimentos y comida de mascotas.</li><li>Retira la ceniza con cuidado y evita que llegue a coladeras o drenajes.</li></ul><a class="link" href="https://www.gob.mx/cenapred/es/articulos/volcan-popocatepetl-caida-de-ceniza?idiom=es" target="_blank" rel="noopener noreferrer">Recomendaciones de CENAPRED ante ceniza ↗</a></section>
    <section class="guidance-card"><small>Si las autoridades indican evacuar</small><h2>Sal por la ruta asignada</h2><ul><li>Dirígete al punto de reunión y aborda el transporte indicado por tu localidad.</li><li>Sigue las instrucciones oficiales y acude al refugio que te asignen.</li><li>No te acerques al volcán ni permanezcas en barrancas ante lluvias fuertes.</li></ul></section>
  </div>
  <p class="guidance-source">Fuente base: Programa Especial para Contingencias del Volcán Popocatépetl, Gobierno de Puebla, pp. 12 y 19–25. <a class="link" href="https://proteccioncivil.puebla.gob.mx/images/site/planes/PROGRAMaESPECIAL-POPOCATEPETL.pdf" target="_blank" rel="noopener noreferrer">Consultar programa completo ↗</a></p>`;
}
function rainPlan(){
  return `<div class="guidance-back">${back('inicio','Inicio')}</div><small class="kicker">Programa Especial para la Temporada de Lluvias y Ciclones Tropicales</small><h1>Lluvia intensa e inundaciones</h1>
  <p class="guidance-intro">Prepara una ruta segura antes de la lluvia y evita exponerte a corrientes, zonas inundadas y laderas inestables.</p>
  <aside class="guidance-lead"><b>Revisa avisos meteorológicos y de Protección Civil de tu localidad.</b><p>Las condiciones cambian por zona. Esta página ofrece preparación general y no sustituye una alerta o instrucción oficial.</p><a class="link" href="https://smn.conagua.gob.mx/es/pronostico-meteorologico-general" target="_blank" rel="noopener noreferrer">Consultar pronóstico del Servicio Meteorológico Nacional ↗</a></aside>
  <div class="guidance-grid">
    <section class="guidance-card"><small>Antes</small><h2>Prepara tu casa y tu salida</h2><ul><li>Limpia coladeras y desagües solo si puedes hacerlo con seguridad; no te acerques a ríos crecidos.</li><li>Identifica un lugar alto, una ruta y el refugio temporal señalado por tu municipio.</li><li>Guarda documentos en una bolsa sellada; prepara radio, lámpara, botiquín y agua potable.</li><li>Asegura objetos sueltos y prevé cómo proteger a tus animales.</li></ul></section>
    <section class="guidance-card"><small>Durante la lluvia</small><h2>Aléjate del agua y las laderas</h2><ul><li>Nunca camines ni conduzcas por corrientes o caminos inundados; no cruces ríos, arroyos ni puentes cubiertos por agua.</li><li>Evita barrancas, cauces, postes y cables eléctricos, y zonas con señales de deslave.</li><li>Si Protección Civil indica evacuar, sal de inmediato hacia el lugar seguro señalado.</li><li>Si el agua entra a tu casa, evita zonas eléctricas; corta la energía solo si hacerlo es seguro.</li></ul></section>
    <section class="guidance-card"><small>Después</small><h2>Regresa con autorización</h2><ul><li>No regreses hasta que las autoridades confirmen que es seguro.</li><li>No consumas agua ni alimentos que tocaron el agua de inundación.</li><li>Evita cables caídos, daños estructurales y agua estancada; reporta peligros a Protección Civil.</li></ul><a class="link" href="https://www.gob.mx/cenapred/es/articulos/que-son-las-inundaciones-subitas-y-que-papel-juegan-las-lluvias?idiom=es" target="_blank" rel="noopener noreferrer">Guía de CENAPRED para inundaciones súbitas ↗</a></section>
  </div>
  <p class="guidance-source">Fuente base: Programa Especial de Protección Civil para la Temporada de Lluvias y Ciclones Tropicales 2026, Gobierno de Puebla, pp. 33–36 y 43. <a class="link" href="https://proteccioncivil.puebla.gob.mx/images/site/planes/PLAN-HIDROMETEOROLOGICO.pdf" target="_blank" rel="noopener noreferrer">Consultar programa completo ↗</a></p>`;
}
function earthquakePlan(){
  return `<div class="guidance-back">${back('inicio','Inicio')}</div><small class="kicker">Programa Especial de Protección Civil · Plan Sismo Puebla</small><h1>Sismos</h1>
  <p class="guidance-intro">Identifica zonas de menor riesgo y acuerda con tu familia qué hacer antes, durante y después de un sismo.</p>
  <aside class="guidance-lead"><b>La alerta sísmica puede no activarse en todos los sismos.</b><p>El Plan Sismo Puebla indica que SASMEX no alerta ante sismos menores ni ante sismos fuera de la cobertura de sus sensores. Mantén listo tu plan y consulta información oficial.</p><a class="link" href="https://www.ssn.unam.mx/" target="_blank" rel="noopener noreferrer">Ver información del Servicio Sismológico Nacional ↗</a></aside>
  <div class="guidance-grid">
    <section class="guidance-card"><small>Antes</small><h2>Reduce riesgos</h2><ul><li>Asegura muebles y objetos que puedan caer; despeja las rutas de salida.</li><li>Ubica las zonas de menor riesgo dentro y fuera de tu casa y fija un punto de reunión.</li><li>Prepara contactos, botiquín, radio, lámpara y documentos importantes.</li><li>Practica simulacros y asigna tareas a cada integrante de la familia.</li></ul></section>
    <section class="guidance-card"><small>Durante</small><h2>Protégete</h2><ul><li>Mantén la calma y dirígete a la zona de menor riesgo que identificaste.</li><li>Aléjate de ventanas, vidrios y objetos que puedan caer; protege tu cabeza.</li><li>No uses elevadores ni escaleras mientras tiembla. Sigue el protocolo del inmueble.</li></ul><a class="link" href="https://www.gob.mx/cenapred/articulos/conocemas-como-funciona-la-alerta-sismica" target="_blank" rel="noopener noreferrer">Qué hacer ante la alerta sísmica ↗</a></section>
    <section class="guidance-card"><small>Después</small><h2>Revisa y mantente a salvo</h2><ul><li>Verifica si hay personas lesionadas y solicita ayuda si hace falta.</li><li>No uses edificios dañados ni vuelvas a entrar hasta que Protección Civil lo indique.</li><li>Evita cables caídos y posibles fugas de gas; prepárate para réplicas.</li><li>Usa el teléfono solo para emergencias y consulta reportes oficiales.</li></ul></section>
  </div>
  <p class="guidance-source">Fuente base: Programa Especial de Protección Civil “Plan Sismo Puebla”, Gobierno de Puebla, pp. 16–17 y 35–39. <a class="link" href="https://proteccioncivil.puebla.gob.mx/images/site/planes/PROGRAMAESPECIAL-EMERGENCIASSISMICAS.pdf" target="_blank" rel="noopener noreferrer">Consultar programa completo ↗</a></p>`;
}
function plans(id){
  const plan = planTopics.find(topic=>topic[0]===id);
  if(id==='volcan')return volcanoPlan();
  if(id==='lluvias')return rainPlan();
  if(id==='sismos')return earthquakePlan();
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
  const monitors=[
    ['volcano','🌋','Actividad volcánica','CENAPRED','https://www.cenapred.gob.mx/es/PDF/2025-02-15.pdf'],
    ['rain','🌧','Lluvia e inundaciones','Protección Civil Puebla','https://proteccioncivil.puebla.gob.mx/images/site/planes/PLAN-HIDROMETEOROLOGICO.pdf'],
    ['quake','⚡','Sismos','Plan Sismo Puebla','https://proteccioncivil.puebla.gob.mx/images/site/planes/PROGRAMAESPECIAL-EMERGENCIASSISMICAS.pdf']
  ];
  const zones=[
    ['Huauchinango',20.174,-98.052,'medium','high','low','Sierra Norte'],
    ['Xicotepec',20.276,-97.961,'low','high','low','Sierra Norte'],
    ['Zacatlán',19.933,-97.961,'low','high','low','Sierra Norte'],
    ['Chignahuapan',19.838,-98.031,'low','high','medium','Sierra Norte'],
    ['Tetela de Ocampo',19.817,-97.806,'low','high','medium','Sierra Norte'],
    ['Cuetzalan',20.018,-97.523,'low','high','low','Sierra Nororiental'],
    ['Teziutlán',19.817,-97.359,'low','high','low','Sierra Nororiental'],
    ['Atempan',19.839,-97.458,'low','high','medium','Sierra Nororiental'],
    ['Tlatlauquitepec',19.852,-97.495,'low','high','medium','Sierra Nororiental'],
    ['San Martín Texmelucan',19.285,-98.438,'medium','medium','medium','Valle de Texmelucan'],
    ['Huejotzingo',19.159,-98.407,'medium','medium','low','Valle de Texmelucan'],
    ['San Pedro Cholula',19.058,-98.306,'medium','medium','medium','Zona metropolitana'],
    ['Puebla',19.043,-98.198,'low','medium','high','Zona metropolitana'],
    ['Amozoc',19.043,-98.045,'low','medium','high','Zona metropolitana'],
    ['Tepeaca',18.967,-97.900,'low','medium','high','Valle de Tepeaca'],
    ['Atlixco',18.908,-98.437,'high','medium','medium','Valle de Atlixco'],
    ['Tianguismanalco',18.976,-98.455,'high','medium','medium','Entorno del Popocatépetl'],
    ['Tochimilco',18.900,-98.572,'high','medium','medium','Entorno del Popocatépetl'],
    ['San Nicolás de los Ranchos',19.072,-98.483,'high','medium','medium','Entorno del Popocatépetl'],
    ['Izúcar de Matamoros',18.601,-98.462,'low','low','high','Mixteca poblana'],
    ['Tehuacán',18.462,-97.393,'low','low','high','Valle de Tehuacán']
  ];
  const levels={low:['Bajo','low'],medium:['Moderado','medium'],high:['Alto','high']};
  const layerNames={volcano:'Actividad volcánica',rain:'Lluvia e inundaciones',quake:'Sismos'};
  const current=zones.find(z=>z[0]===selectedZone)||zones.find(z=>z[0]===towns[town])||zones[7];
  const selectedRisk=levels[current[hazardLayer==='volcano'?3:hazardLayer==='rain'?4:5]];
  const markers=zones.map(z=>{
    const risk=levels[z[hazardLayer==='volcano'?3:hazardLayer==='rain'?4:5]];
    const x=(z[2]+99.0)/2.35*100;
    const y=(20.95-z[1])/3.35*100;
    return `<button type="button" class="risk-marker risk-${risk[1]} ${z[0]===current[0]?'selected':''}" style="left:${x}%;top:${y}%" data-zone="${z[0]}" aria-label="${z[0]}: riesgo simulado ${risk[0]}" title="${z[0]} · ${risk[0]} (simulación)"><span aria-hidden="true">!</span></button>`;
  }).join('');
  const bounds=encodeURIComponent('-99.0,17.6,-96.65,20.95');
  const marker=encodeURIComponent(`${current[1]},${current[2]}`);
  return `${back()}<div class="map-heading"><div><small class="kicker">Escenario de simulación</small><h1>Mi ciudad</h1></div>${select()}</div>
  <div class="map-monitors" role="group" aria-label="Capas de simulación">${monitors.map(([key,symbol,title,source])=>`<button type="button" class="map-monitor ${hazardLayer===key?'active':''}" data-layer="${key}" aria-pressed="${hazardLayer===key}"><span class="map-monitor-icon" aria-hidden="true">${symbol}</span><span class="map-monitor-copy"><b>${title}</b><small>${source} · capa del ejercicio</small></span></button>`).join('')}</div>
  <section class="risk-summary"><div><h2>Escenario: ${layerNames[hazardLayer]}</h2><p>Distribución ilustrativa basada en zonas de susceptibilidad y regionalización publicadas.</p></div><div class="risk-badges"><span class="risk-badge risk-high">● Alto</span><span class="risk-badge risk-medium">● Moderado</span><span class="risk-badge risk-low">● Bajo</span></div></section>
  <section class="card map-card"><div class="map-shell risk-map-shell"><iframe title="Mapa de referencia del estado de Puebla" src="https://www.openstreetmap.org/export/embed.html?bbox=${bounds}&amp;layer=mapnik&amp;marker=${marker}"></iframe><div class="risk-markers" aria-label="Marcadores de riesgo simulado">${markers}</div><aside class="map-popup"><small>Zona seleccionada · ${current[6]}</small><h2>${current[0]}</h2><p>${layerNames[hazardLayer]}: <b class="risk-text-${selectedRisk[1]}">${selectedRisk[0]} · simulación</b></p><small>Referencia territorial; no representa una alerta vigente ni una medición en tiempo real.</small></aside><div class="map-live-pill simulation-pill"><span aria-hidden="true">●</span> SIMULACIÓN · Puebla</div></div><p class="map-method"><b>Cómo leerlo:</b> los colores son un escenario para el prototipo. Lluvia: prioriza la mayor concurrencia de susceptibilidades del norte y centro-norte señalada por Protección Civil. Sismos: toma como referencia la clasificación municipal del Plan Sismo. Volcán: representa cercanía a las zonas de peligro del mapa de CENAPRED. Confirma siempre con autoridades.</p><div class="map-sources"><a href="${monitors[0][4]}" target="_blank" rel="noopener noreferrer">Mapa de peligro volcánico CENAPRED ↗</a><a href="${monitors[1][4]}" target="_blank" rel="noopener noreferrer">Mapa hidrometeorológico estatal ↗</a><a href="${monitors[2][4]}" target="_blank" rel="noopener noreferrer">Regionalización sísmica estatal ↗</a></div></section>`;
}

function routesPage(){
  const graph=routeGraph();
  const activeReports=[...roadReports.filter(r=>Number(r.town)===town),...(demoHazard&&demoHazard.town===town?[demoHazard]:[])];
  const byEdge=new Map();for(const report of activeReports){if(!byEdge.has(report.street))byEdge.set(report.street,[]);byEdge.get(report.street).push(report)}
  const risks=new Map();
  for(const edge of graph.edges){const reports=byEdge.get(edge.id)||[],blocked=roadBlocked.includes(town+':'+edge.id)||reports.some(r=>r.impact==='blocked');if(!reports.length&&!blocked)continue;
    const weights={low:3,medium:9,high:20},severity=Math.max(...reports.map(r=>weights[r.severity]||9),0),types=new Set(reports.map(r=>r.hazard));
    const confidence=Math.min(.9,.35+Math.max(0,reports.length-1)*.12),uncertainty=types.size>1?16:reports.length>1?3:6;
    const impact=reports.some(r=>r.impact==='partial')?1.5:reports.some(r=>r.impact==='passable')?.6:1;
    risks.set(edge.id,{blocked,penalty:severity*confidence*impact+uncertainty,reports});
  }
  const openDestinations=places.map((p,i)=>p[2]===town&&p[3]==='Abierto'?[p,i]:null).filter(Boolean);
  if(!openDestinations.some(([,i])=>i===routeDestination))routeDestination=openDestinations[0]?.[1]??null;
  const destinationName=routeDestination===null?'refugio por confirmar':places[routeDestination][0];
  const destinations=openDestinations.map(([p,i])=>'<option value="'+i+'" '+(i===routeDestination?'selected':'')+'>'+escapeHTML(p[0])+'</option>').join('');
  const destinationNodes=town===0?{0:15,1:11}:{2:15},goal=destinationNodes[routeDestination]??15;
  const origins=[[0,'Acceso norte'],[5,'Zona centro'],[10,'Punto de reunión'],[15,'Acceso sur']];
  if(!origins.some(([node])=>node===routeOrigin))routeOrigin=0;
  const originOptions=origins.map(([node,name])=>'<option value="'+node+'" '+(node===routeOrigin?'selected':'')+'>'+name+'</option>').join('');
  const baseline=shortestRoute(graph,routeOrigin,goal,false,risks),safe=shortestRoute(graph,routeOrigin,goal,true,risks);
  const baselineBlocked=baseline?baseline.edges.filter(edge=>risks.get(edge.id)?.blocked):[];
  const routeLine=(edge,offset,className)=>{const a=graph.nodes[edge.a],b=graph.nodes[edge.b],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ox=-dy/len*offset,oy=dx/len*offset;return '<line x1="'+(a.x+ox)+'" y1="'+(a.y+oy)+'" x2="'+(b.x+ox)+'" y2="'+(b.y+oy)+'" class="'+className+'" aria-hidden="true"></line>'};
  const lines=graph.edges.map(edge=>{
    const risk=risks.get(edge.id),baseClass='network-edge '+(risk?.blocked?'network-blocked':risk?'network-risk':'');
    const selectable='<line x1="'+graph.nodes[edge.a].x+'" y1="'+graph.nodes[edge.a].y+'" x2="'+graph.nodes[edge.b].x+'" y2="'+graph.nodes[edge.b].y+'" class="'+baseClass+'" data-street="'+edge.id+'" tabindex="0" role="button" aria-label="Seleccionar '+escapeHTML(edge.label)+' para reportar"></line>';
    const base=baseline?.edges.some(e=>e.id===edge.id)?routeLine(edge,-5,'route-baseline-line'):'';
    const safer=safe?.edges.some(e=>e.id===edge.id)?routeLine(edge,5,'route-safe-line'):'';
    return selectable+base+safer;
  }).join('');
  const nodes=graph.nodes.map(node=>{const label=node.id===routeOrigin?'O':node.id===goal?'R':'';return '<g class="network-node '+(label?'network-node-active':'')+'" transform="translate('+node.x+' '+node.y+')" aria-label="'+(label==='O'?'Origen':label==='R'?'Refugio':'Cruce')+'"><circle r="'+(label?15:8)+'"></circle>'+(label?'<text y="5">'+label+'</text>':'')+'</g>'}).join('');
  const edgeOptions=graph.edges.map(edge=>'<option value="'+edge.id+'" '+(edge.id===routeSelectedStreet?'selected':'')+'>'+escapeHTML(edge.label)+'</option>').join('');
  if(!graph.edges.some(edge=>edge.id===routeSelectedStreet))routeSelectedStreet=graph.edges[0].id;
  const modeNotice=roadMode==='compartido'
    ?'<div class="route-storage shared">Reportes compartidos con el servidor municipal.</div>'
    :'<div class="route-storage local">'+(hosted?'No se pudo conectar al registro compartido. Los reportes de esta sesión se guardan solo en este navegador.':'Modo demostración: los reportes se guardan solo en este navegador y no se comparten con otras personas.')+'</div>';
  const list=roadReports.filter(r=>Number(r.town)===town).slice(0,30);
  const reportRows=list.length?list.map(r=>{
    const street=(routeGraph().edges.find(edge=>edge.id===r.street)?.label)||'Tramo reportado';
    const photo=r.photo|| (r.hasPhoto&&roadMode==='compartido'?'/api/routes/photo/'+encodeURIComponent(r.id):'');
    const date=r.created?new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(new Date(r.created)):'Reciente';
    return '<article class="road-report"><div><span class="road-tag">'+escapeHTML(hazardLabels[r.hazard]||'Reporte ciudadano')+'</span> <span class="road-impact impact-'+escapeHTML(r.impact||'blocked')+'">'+(r.impact==='blocked'?'Tramo excluido':r.impact==='partial'?'Paso parcial':'Paso reportado')+'</span><h3>'+escapeHTML(street)+'</h3><small>'+escapeHTML(date)+' · Severidad '+escapeHTML(r.severity||'media')+' · Pendiente de verificación</small>'+(r.note?'<p>'+escapeHTML(r.note)+'</p>':'')+'</div>'+(photo?'<a class="road-photo-link" href="'+escapeHTML(photo)+'" target="_blank" rel="noopener"><img class="road-photo" src="'+escapeHTML(photo)+'" alt="Foto adjunta al reporte de '+escapeHTML(street)+'" loading="lazy"></a>':'')+'</article>';
  }).join(''):'<p class="muted">Aún no hay reportes de calle para '+escapeHTML(towns[town])+'.</p>';
  const routeCard=(route,title,details)=>{
    if(!route)return '<article class="route-option unavailable"><span>Sin ruta calculable</span><h3>'+title+'</h3><small>'+details+'</small></article>';
    const hazardCount=route.edges.filter(edge=>risks.has(edge.id)).length;
    return '<article class="route-option"><span class="'+(hazardCount?'route-caution':'route-ok')+'">'+(hazardCount?'⚠ Pasa por '+hazardCount+' tramo(s) reportado(s)':'● Sin reportes activos en el trayecto')+'</span><h3>'+title+'</h3><small>'+details+'</small><div class="route-metrics"><b>'+route.edges.length+' tramos</b><b>'+route.km.toFixed(2)+' km aprox.</b></div></article>';
  };
  const baseCard=routeCard(baseline,'Ruta más corta','Origen → '+escapeHTML(destinationName)+' · Ignora reportes para comparar');
  const safeCard=routeCard(safe,'Ruta con menor riesgo','Origen → '+escapeHTML(destinationName)+' · Considera severidad, paso y reportes');
  const loading=roadMode==='cargando';
  const demoNotice=demoHazard?.town===town?'<div class="route-demo-note">Escenario de prueba activo: derrumbe simulado en '+escapeHTML(graph.edges.find(e=>e.id===demoHazard.street)?.label||'un tramo')+'. Solo existe en esta sesión.</div>':'';
  const legend=[['network-edge','Red vial esquemática'],['route-baseline-line','Ruta más corta'],['route-safe-line','Ruta con menor riesgo'],['network-blocked','Tramo excluido']];
  return back()+'<div class="map-heading"><div><small class="kicker">Comparación de seguridad vial</small><h1>Rutas</h1></div>'+select()+'</div>'+
  '<section class="route-alert"><b>Encuentra una alternativa con menos riesgos</b><p>Comparamos el trayecto más corto con otro que considera reportes de la comunidad. Los tramos marcados como no transitables se excluyen y las nuevas alertas recalculan la ruta automáticamente. Es una simulación de apoyo, no navegación oficial.</p></section>'+
  modeNotice+
  demoNotice+
  '<section class="route-section"><div class="route-section-head"><div><small>Origen y destino</small><h2>¿A dónde necesitas llegar?</h2></div><div class="route-selects"><label>Punto de salida<select id="route-origin">'+originOptions+'</select></label><label>Refugio destino<select id="route-destination">'+destinations+'</select></label></div></div>'+
  '<div class="route-map" role="group" aria-label="Red vial esquemática con rutas comparadas"><svg viewBox="0 0 680 420" aria-labelledby="route-map-title"><title id="route-map-title">Mapa esquemático de rutas para '+escapeHTML(towns[town])+'</title>'+lines+nodes+'</svg></div><div class="route-map-legend">'+legend.map(([klass,label])=>'<span><i class="'+klass+'"></i>'+label+'</span>').join('')+'</div>'+
  '<div class="route-options route-comparison">'+baseCard+safeCard+'</div>'+
  (baselineBlocked.length?'<p class="route-warning">La ruta más corta atraviesa '+baselineBlocked.length+' tramo(s) reportado(s) como no transitables; queda solo como comparación y no se recomienda.</p>':'')+
  (loading?'<p role="status" class="route-loading">Consultando reportes antes de calcular rutas…</p>':'')+
  '<p class="route-explainer">Cada segmento es esquemático. La distancia solo ilustra el cálculo; no representa calles, tiempos ni condiciones reales.</p><button type="button" class="route-sim-button" data-scenario="'+(demoHazard?'clear':'blocked')+'">'+(demoHazard?'Quitar escenario de prueba':'Probar un derrumbe y ver el recálculo')+'</button></section>'+
  '<section class="route-section"><small>Participación ciudadana</small><h2>Reportar una condición en la vía</h2><p>Elige un segmento del mapa, describe lo que ves y adjunta una foto si puedes. Los reportes son provisionales hasta que una autoridad los confirme.</p>'+
  '<form id="route-report-form" class="route-form"><label>Segmento de la vía<select name="street" required>'+edgeOptions+'</select></label><label>Situación observada<select name="hazard" required>'+Object.entries(hazardLabels).map(([id,name])=>'<option value="'+id+'">'+name+'</option>').join('')+'</select></label><label>Severidad observada<select name="severity"><option value="high">Alta</option><option value="medium" selected>Media</option><option value="low">Baja</option></select></label><label>¿Cómo está el paso?<select name="impact"><option value="blocked" selected>No transitable · excluir tramo</option><option value="partial">Paso parcial · penalizar ruta</option><option value="passable">Paso posible · tomar con precaución</option></select></label><label class="route-full">Descripción breve <span class="muted">(opcional)</span><textarea name="note" maxlength="350" rows="3" placeholder="Describe lo que observaste, sin incluir datos personales"></textarea></label><label class="route-full">Foto <span class="muted">(opcional)</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label><small class="route-privacy">La imagen se comparte con el reporte. Evita incluir rostros, placas o información privada. Los reportes inician con confianza baja.</small><button type="submit" '+(loading?'disabled':'')+'>Enviar reporte y recalcular</button><p class="route-form-status" role="status" aria-live="polite"></p></form></section>'+
  '<section class="route-section"><div class="route-section-head"><div><small>Observaciones comunitarias</small><h2>Reportes de '+escapeHTML(towns[town])+'</h2></div><button type="button" class="route-refresh" data-refresh-routes>Actualizar</button></div><div class="road-report-list">'+list+'</div></section>'+
  '<p class="route-disclaimer">Esta demostración no garantiza una ruta segura ni confirma cierres reales. Ante una emergencia, sigue a Protección Civil y llama al 911.</p>';
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
    const report={town,street:String(data.get('street')),hazard:String(data.get('hazard')),severity:String(data.get('severity')||'medium'),impact:String(data.get('impact')||'blocked'),note:String(data.get('note')||'').trim(),photo:await compressRoutePhoto(photoFile)};
    if(!routeGraph().edges.some(edge=>edge.id===report.street)||!Object.hasOwn(hazardLabels,report.hazard)||!['low','medium','high'].includes(report.severity)||!['blocked','partial','passable'].includes(report.impact))throw Error('Selecciona un tramo y una situación válidos.');
    if(roadMode==='compartido'){
      const response=await fetch('/api/routes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});
      if(!response.ok)throw Error(response.status===413?'La foto es demasiado grande. Prueba con otra imagen.':'No se pudo guardar el reporte compartido. Inténtalo de nuevo.');
      const result=await response.json();roadReports=result.reports||roadReports;roadBlocked=result.blocked||roadBlocked;roadMode='compartido';
    }else{
      report.created=new Date().toISOString();report.id='local-'+Date.now();
      const updated=[report,...localRoadReports()];
      try{localStorage.setItem('sicep.route-reports.v1',JSON.stringify(updated))}catch{throw Error('No hay espacio local para guardar la foto. Prueba sin foto.')}
      roadReports=updated;roadBlocked=[...new Set(updated.filter(r=>r.impact==='blocked').map(r=>r.town+':'+r.street))];
    }
    render();
  }catch(error){button.disabled=false;status.textContent=error.message||'No se pudo enviar el reporte.'}
}

const actionCards = {
  avisos: ['Consultar avisos', 'Boletines oficiales y avisos municipales'],
  refugios: ['Buscar refugios', 'Direcciones y disponibilidad del ejercicio'],
  mapa: ['Explorar mapa municipal', 'Ubica el municipio seleccionado'],
  rutas: ['Consultar rutas', 'Alternativas y reportes de calles'],
  planes: ['Planes de Protección Civil', 'Consulta por tipo de emergencia'],
  contactos: ['Números de atención', 'Emergencias y denuncia anónima'],
  guia: ['Preparar a mi familia', 'Completa tu lista de preparación'],
  coord: ['Coordinación municipal', 'Consulta el expediente y las tareas de brigada']
};
const actionsByPage = {
  inicio: ['avisos','refugios','mapa','rutas','planes','contactos','guia'],
  avisos: ['mapa','refugios','planes'],
  refugios: ['mapa','avisos','contactos'],
  detalle: ['refugios','mapa','contactos'],
  guia: ['planes','refugios','contactos'],
  contactos: ['avisos','refugios','guia'],
  mapa: ['avisos','rutas','refugios'],
  rutas: ['mapa','refugios','contactos'],
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
  <section class="monitoring" aria-labelledby="monitoring-title"><small>Protección civil</small><h2 id="monitoring-title">Monitoreo</h2><div class="tiles monitoring-tiles"><a class="tile monitoring-tile" href="#planes/volcan"><img src="assets/POPOCATEPETL.jpg" alt="Vista del volcán Popocatépetl"><b>Actividad volcánica</b></a><a class="tile monitoring-tile" href="#planes/lluvias"><img src="assets/LLUVIAS.jpeg" alt="Lluvia intensa en una zona urbana"><b>Lluvia intensa e inundaciones</b></a><a class="tile monitoring-tile" href="#planes/sismos"><img src="assets/SISMO.jpeg" alt="Mapa de intensidad sísmica"><b>Sismos</b></a></div></section>
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
switch(page){case 'refugios':content=shelters();break;case 'detalle':content=detail(Number(id));break;case 'coord':town=1;content=coordination();break;case 'avisos':content=back()+'<h1>Avisos municipales</h1>'+select()+'<section class="card notice"><small>'+alerts[town][2]+'</small><h2>'+alerts[town][0]+'</h2><p>'+alerts[town][1]+'</p><p>Consulta la información oficial vigente en el portal estatal.</p>'+source+'</section><a class="link" href="#refugios">Ver refugios de '+towns[town]+'</a>';break;case 'contactos':content=contacts();break;case 'mapa':content=riskMap();break;case 'rutas':content=routesPage();break;case 'planes':content=plans(id);break;case 'guia':content=preparation();break;default:page='inicio';content=home()}
if(page==='inicio')content+=bulletinPanel();
if(page==='avisos')content+=bulletinPanel();
if(page!=='inicio')content+=actionPanel(page);
app.innerHTML=page==='inicio'?content:'<div class="sheet">'+content+'</div>';paintBulletins();document.title=(labels[page]||'Protección civil')+' · SICEP Puebla';if(page==='rutas'&&roadMode==='cargando')refreshRoadReports()}
app.addEventListener('change',e=>{if(e.target.id==='town'){town=Number(e.target.value);selectedZone=towns[town];zoom=1;routeDestination=null;routeOrigin=0;routeSelectedStreet=null;demoHazard=null;render()}if(e.target.id==='route-destination'){routeDestination=Number(e.target.value);render()}if(e.target.id==='route-origin'){routeOrigin=Number(e.target.value);render()}});
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
app.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='route-report-form'){submitRoadReport(e.target);return}update(1,Number(new FormData(e.target).get('count')))});
app.addEventListener('click',e=>{const edge=e.target.closest('[data-street]');if(edge){routeSelectedStreet=edge.dataset.street;render();document.querySelector('#route-report-form')?.scrollIntoView({behavior:'smooth',block:'center'});return}let b=e.target.closest('button');if(!b)return;if(b.dataset.refreshRoutes!==undefined)refreshRoadReports();if(b.dataset.scenario){if(b.dataset.scenario==='clear')demoHazard=null;else if(location.hash==='#rutas'){const graph=routeGraph(),active=[...roadReports.filter(r=>Number(r.town)===town),...(demoHazard?[demoHazard]:[])],risks=new Map(active.filter(r=>r.impact==='blocked').map(r=>[r.street,{blocked:true}])),goal=town===0?(routeDestination===1?11:15):15,base=shortestRoute(graph,routeOrigin,goal,false,risks);demoHazard=base?.edges.length?{id:'demo-'+Date.now(),town,street:base.edges[0].id,hazard:'derrumbe',severity:'high',impact:'blocked',note:'Escenario sintético de demostración',created:new Date().toISOString()}:null}render()}if(b.dataset.layer){hazardLayer=b.dataset.layer;render()}if(b.dataset.zone){selectedZone=b.dataset.zone;render()}if(b.dataset.mode){mode=b.dataset.mode;render()}if(b.dataset.zoom){zoom=Math.min(1.6,Math.max(1,zoom+Number(b.dataset.zoom)*.2));render()}if(b.dataset.step){let stage=Number(b.dataset.step);update(stage,incident?.count||35)}});
app.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const edge=e.target.closest('[data-street]');if(edge){e.preventDefault();routeSelectedStreet=edge.dataset.street;render()}});
window.addEventListener('hashchange',()=>{render();scrollTo(0,0)});render();

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
