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
const shelterMunicipality=()=>shelterTown??town;
let town=1,mode='lista',zoom=1,incident=null;
let shelterQuery='',shelterStatus='',shelterTown=null,shelterMapId=null;
let hazardLayer='rain',selectedZone='Atempan';
let roadReports=[],roadBlocked=[],roadMode='cargando',roadLoading=false,routeDestination=null,routeOrigin=null,routeReportPoint=null,routeMapMode='origin',routeResult=null,routeMapInstance=null,routeMapLayers=null,routeRequestId=0,routeNotice='';
let revision='',connection='Cargando registro municipal…';
const hosted=location.protocol!=='file:';
const townCenters=[[19.0505,-98.3070],[19.8295,-97.4592]];
const refugeCoordinates={0:{0:[19.0640,-98.3055],1:[19.0578,-98.3160]},1:{2:[19.8377,-97.4580]}};
const hazardLabels={derrumbe:'Derrumbe o deslave',socavon:'Socavón',inundacion:'Inundación o corriente',obstruccion:'Calle obstruida',otro:'Otro peligro'};
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function localRoadReports(){try{const v=JSON.parse(localStorage.getItem('sicep.route-reports.v1')||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
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
async function sync(){
  if(!hosted){try{incident=JSON.parse(localStorage.getItem('sicep.demo.v1')||'{"stage":1,"count":35}')}catch{}connection='Ejercicio local';render();return}
  try{
    const r=await fetch('/api/situation',{cache:'no-store'});
    if(!r.ok)throw Error();
    const data=await r.json();
    const changed=revision!==data.updated || connection!=='Registro municipal compartido';
    revision=data.updated;incident=data;connection='Registro municipal compartido';
    if(changed)render();
  }catch{if(connection!=='Registro municipal sin conexión'){connection='Registro municipal sin conexión';render()}}
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
  if(!routeOrigin)routeOrigin=[...townCenters[town]];
  const openDestinations=places.map((p,i)=>p[2]===town&&p[3]==='Abierto'?[p,i]:null).filter(Boolean);
  if(!openDestinations.some(([,i])=>i===routeDestination))routeDestination=openDestinations[0]?.[1]??null;
  const destinations=openDestinations.map(([p,i])=>'<option value="'+i+'" '+(i===routeDestination?'selected':'')+'>'+escapeHTML(p[0])+'</option>').join('');
  const list=roadReports.filter(r=>Number(r.town)===town).slice(0,30);
  const reportRows=list.length?list.map(r=>{
    const photo=r.photo||(r.hasPhoto&&roadMode==='compartido'?'/api/routes/photo/'+encodeURIComponent(r.id):'');
    const date=r.created?new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(new Date(r.created)):'Reciente';
    const place=Number.isFinite(Number(r.latitude??r.lat))?'Punto marcado en el mapa':'Sin ubicación';
    const status=r.impact==='blocked'?'No se puede pasar':r.impact==='partial'?'Paso difícil':'Paso posible';
    const severity={high:'Alta',medium:'Media',low:'Baja'}[r.severity]||'Media';
    return '<article class="road-report"><div><span class="road-tag">'+escapeHTML(hazardLabels[r.hazard]||'Reporte')+'</span> <span class="road-impact impact-'+escapeHTML(r.impact||'blocked')+'">'+status+'</span><h3>'+escapeHTML(place)+'</h3><small>'+escapeHTML(date)+' · Gravedad '+severity+' · Por confirmar</small>'+(r.note?'<p>'+escapeHTML(r.note)+'</p>':'')+'</div>'+(photo?'<a class="road-photo-link" href="'+escapeHTML(photo)+'" target="_blank" rel="noopener"><img class="road-photo" src="'+escapeHTML(photo)+'" alt="Foto adjunta al reporte" loading="lazy"></a>':'')+'</article>';
  }).join(''):'<p class="muted">Aún no hay reportes de '+escapeHTML(towns[town])+'.</p>';
  return back()+'<div class="map-heading"><div><h1>Rutas</h1></div>'+select()+'</div>'+(routeNotice?'<p class="route-feedback" role="status">'+escapeHTML(routeNotice)+'</p>':'')+
  '<section class="route-section route-live"><div class="route-section-head"><div><small>'+escapeHTML(towns[town])+'</small><h2>Cómo llegar</h2></div><label class="route-destination">Refugio<select id="route-destination" '+(routeDestination===null?'disabled':'')+'>'+destinations+'</select></label></div>'+
  '<div class="route-map-tools"><button type="button" data-route-mode="origin" class="'+(routeMapMode==='origin'?'selected':'')+'">Elegir salida</button><button type="button" data-route-mode="'+(routeMapMode==='report'?'origin':'report')+'" class="'+(routeMapMode==='report'?'selected':'')+'">'+(routeMapMode==='report'?'Cancelar reporte':'Reportar peligro')+'</button><button type="button" class="route-location" data-route-location>Usar mi ubicación</button></div>'+
  '<p class="route-map-hint" id="route-map-hint">'+escapeHTML(routeMapMode==='origin'?'Toca el mapa para elegir tu punto de partida.':'Toca el mapa para marcar el problema.')+'</p><div id="route-real-map" class="route-real-map" role="application" aria-label="Mapa de rutas"></div>'+
  '<div class="route-map-legend"><span><i class="legend-fast"></i>Ruta sugerida</span><span><i class="legend-safer"></i>Menos reportes cerca</span><span><i class="legend-hazard"></i>Reporte</span><span><i class="legend-refuge"></i>Refugio</span></div>'+
  '<div class="route-route-cards" id="route-route-cards"><div class="route-loading">Buscando ruta…</div></div></section>'+ 
  (routeMapMode==='report'?'<section class="route-section route-report-panel"><div class="route-section-head"><div><small>Nuevo reporte</small><h2>¿Qué encontraste?</h2></div></div><p class="route-map-hint">Marca primero el punto en el mapa y completa los datos del problema.</p>'+
  '<form id="route-report-form" class="route-form"><p class="route-point-summary route-full" id="route-point-summary">'+(routeReportPoint?'Punto marcado en el mapa.':'Marca el punto en el mapa.')+'</p><label>Qué ocurre<select name="hazard" required>'+Object.entries(hazardLabels).map(([id,name])=>'<option value="'+id+'">'+name+'</option>').join('')+'</select></label><label>Gravedad<select name="severity"><option value="high">Alta</option><option value="medium" selected>Media</option><option value="low">Baja</option></select></label><label>¿Se puede pasar?<select name="impact"><option value="blocked" selected>No</option><option value="partial">Con dificultad</option><option value="passable">Sí, con precaución</option></select></label><label>Descripción <span class="muted">(opcional)</span><textarea name="note" maxlength="350" rows="3" placeholder="Cuéntanos qué viste"></textarea></label><label class="route-full">Foto <span class="muted">(opcional)</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label><small class="route-privacy">Reportes vecinales; confirma la situación antes de salir.</small><button type="submit" '+(!routeReportPoint?'disabled':'')+'>Enviar reporte</button><p class="route-form-status" role="status" aria-live="polite"></p></form></section>':'')+
  '<section class="route-section"><div class="route-section-head"><div><small>Observaciones comunitarias</small><h2>Reportes de '+escapeHTML(towns[town])+'</h2></div><button type="button" class="route-refresh" data-refresh-routes>Actualizar</button></div><div class="road-report-list">'+reportRows+'</div></section>'+
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
  const destination=refugeCoordinates[town]?.[routeDestination]||townCenters[town];
  const routeStart=routeResult?.snappedOrigin||routeOrigin,routeEnd=routeResult?.snappedDestination||destination;
  L.marker(routeEnd,{icon:L.divIcon({className:'route-marker refuge-marker',html:'<span>R</span>',iconSize:[34,34],iconAnchor:[17,17]})}).bindPopup('<b>'+escapeHTML(places[routeDestination]?.[0]||'Refugio')+'</b>').addTo(routeMapLayers);
  L.marker(routeStart,{icon:L.divIcon({className:'route-marker origin-marker',html:'<span>●</span>',iconSize:[28,28],iconAnchor:[14,14]})}).bindPopup('Salida · inicio ajustado a la calle más cercana').addTo(routeMapLayers);
  const reports=roadReports.filter(r=>Number(r.town)===town);
  for(const report of reports){const lat=Number(report.latitude??report.lat),lon=Number(report.longitude??report.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;const impact=report.impact||'blocked',tone=impact==='blocked'?'blocked':impact==='partial'?'partial':'passable';L.marker([lat,lon],{icon:L.divIcon({className:'route-hazard-icon '+tone,html:'<span>!</span>',iconSize:[34,40],iconAnchor:[17,36]})}).bindPopup('<b>'+escapeHTML(hazardLabels[report.hazard]||'Reporte')+'</b><br>'+escapeHTML(impact==='blocked'?'No se puede pasar':impact==='partial'?'Paso difícil':'Paso posible')+'<br><small>Reporte vecinal · por confirmar</small>').addTo(routeMapLayers)}
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
  paintRouteLayers();calculateRoutes();
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
  return `<section class="hero"><article><small>Protección civil</small><h1>Centro de información de Puebla</h1><p>Avisos, reportes municipales y refugios reunidos por territorio.</p></article><img src="assets/cholula.png" alt="Paisaje ilustrado de Cholula"></section>
  ${actionPanel()}<div class="scope"><div><small>Panorama municipal</small><h2>Situación en ${towns[town]}</h2></div>${select()}</div>
  <div class="stats"><a href="#avisos"><b>1</b> aviso municipal</a><a href="#refugios"><b>${places.filter(p=>p[2]===town&&p[3]==='Abierto').length}</b> refugios abiertos</a><span><b>${active?incident.count:local&&!incident?'—':0}</b> personas reportadas</span></div>
  <section class="monitoring" aria-labelledby="monitoring-title"><small>Protección civil</small><h2 id="monitoring-title">Monitoreo</h2><div class="tiles monitoring-tiles"><a class="tile monitoring-tile" href="#planes/volcan"><img src="assets/POPOCATEPETL.jpg" alt="Vista del volcán Popocatépetl"><b>Actividad volcánica</b></a><a class="tile monitoring-tile" href="#planes/lluvias"><img src="assets/LLUVIAS.jpeg" alt="Lluvia intensa en una zona urbana"><b>Lluvia intensa e inundaciones</b></a><a class="tile monitoring-tile" href="#planes/sismos"><img src="assets/SISMO.jpeg" alt="Mapa de intensidad sísmica"><b>Sismos</b></a></div></section>
  <section class="card"><small>Catálogo y reporte de campo</small><h2>Disponibilidad de refugios</h2>${rows}<a class="link" href="#refugios">Consultar directorio y mapa</a></section>
  <div class="tiles">${tile('contactos','Contactos','Directorio de emergencia')}${tile('coord','Coordinación','Mesa municipal de Atempan')}</div>`;
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
  const municipality=shelterMunicipality();
  const matches=places.map((place,id)=>({place,id})).filter(({place,id})=>
    place[2]===municipality && (!shelterStatus||place[3]===shelterStatus) &&
    normalize([place[0],place[1],ruralShelters[id]?.locality].join(' ')).includes(query)
  );
  const count=matches.length;
  const map=mode==='mapa' && count>0 ? shelterMap(matches) : '';
  return `
    <p class="shelter-count" role="status">${count} ${count===1?'refugio':'refugios'} en ${shelterTowns[municipality]}</p>
    ${map}
    ${count===0?'<div class="card shelter-empty"><h2>Sin coincidencias</h2><p>Prueba otro nombre o cambia el filtro de estado.</p><button type="button" data-clear-shelters>Limpiar filtros</button></div>':
    `<ul class="shelter-list">${matches.map(({place,id})=>`
      <li><a class="row shelter-card" href="#detalle/${id}">
        <span class="icon">${icon('refugios')}</span>
        <div class="shelter-info"><h2>${place[0]}</h2><p>${ruralShelters[id] ? ruralShelters[id].locality+' · ' : ''}${place[1]}</p><p class="shelter-capacity">${shelterCapacity(id)}</p></div>
        ${shelterBadge(place[3])}
      </a></li>`).join('')}</ul>`}
  `;
}

function shelterMap(matches){
  if(shelterMunicipality()!==0){
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
    <p class="shelter-source">Los registros rurales provienen del plan estatal. Consulta con Protección Civil si están habilitados antes de trasladarte. <a class="link" href="${shelterPlan}" target="_blank" rel="noopener">Ver plan estatal</a></p>
    <div class="card shelter-filters" aria-label="Filtros del directorio" role="group">
      <label>Municipio<select id="shelter-town">${shelterTowns.map((name,index)=>`<option value="${index}"${index===shelterMunicipality()?' selected':''}>${name}</option>`).join('')}</select></label>
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
  shelterTown=place[2];
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
function render(){if(routeMapInstance){routeMapInstance.remove();routeMapInstance=null;routeMapLayers=null}let [page,id]=(location.hash.slice(1)||'inicio').split('/');document.querySelector('#nav').innerHTML=Object.entries(labels).map(([k,v])=>'<a class="'+(k===(page==='detalle'?'refugios':page)?'on':'')+'" href="#'+k+'">'+icon(k)+v+'</a>').join('');let content;
switch(page){case 'refugios':content=shelters();break;case 'detalle':content=detail(Number(id));break;case 'coord':town=1;content=coordination();break;case 'avisos':content=back()+'<h1>Avisos municipales</h1>'+select()+'<section class="card notice"><small>'+alerts[town][2]+'</small><h2>'+alerts[town][0]+'</h2><p>'+alerts[town][1]+'</p><p>Consulta la información oficial vigente en el portal estatal.</p>'+source+'</section><a class="link" href="#refugios">Ver refugios de '+towns[town]+'</a>';break;case 'contactos':content=contacts();break;case 'mapa':content=riskMap();break;case 'rutas':content=routesPage();break;case 'planes':content=plans(id);break;case 'guia':content=preparation();break;default:page='inicio';content=home()}
if(page==='inicio')content+=bulletinPanel();
if(page==='avisos')content+=bulletinPanel();
if(page!=='inicio'&&page!=='rutas')content+=actionPanel(page);
app.innerHTML=page==='inicio'?content:'<div class="sheet">'+content+'</div>';paintBulletins();document.title=(labels[page]||'Protección civil')+' · SICEP Puebla';if(page==='rutas'){initializeRouteMap();if(roadMode==='cargando')refreshRoadReports()}}
function changeMunicipality(value){
  town=value;
  selectedZone=towns[town];
  zoom=1;
  routeDestination=null;
  routeOrigin=[...townCenters[town]];
  routeReportPoint=null;
  routeResult=null;
}
app.addEventListener('input',event=>{
  if(event.target.id!=='shelter-query')return;
  shelterQuery=event.target.value;
  refreshShelterResults();
});
app.addEventListener('change',event=>{
  const {id,value}=event.target;
  if(id==='shelter-town'){
    shelterTown=Number(value);
    if(shelterTown<towns.length && shelterTown!==town)changeMunicipality(shelterTown);
    shelterMapId=null;
    zoom=1;
  }else if(id==='shelter-map-point'){
    shelterMapId=Number(value);
  }else if(id==='shelter-status'){
    shelterStatus=value;
  }else{return}
  refreshShelterResults();
  if(id==='shelter-map-point')document.querySelector('#shelter-map-point').focus();
});
app.addEventListener('change',e=>{if(e.target.id==='town'){shelterTown=null;changeMunicipality(Number(e.target.value));render();document.querySelector('#town')?.focus()}if(e.target.id==='route-destination'){routeDestination=Number(e.target.value);render()}});
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
app.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.refreshRoutes!==undefined)refreshRoadReports();if(b.dataset.routeMode){routeMapMode=b.dataset.routeMode;if(routeMapMode==='origin')routeReportPoint=null;render();if(routeMapMode==='report')setTimeout(()=>document.querySelector('#route-real-map')?.scrollIntoView({behavior:'smooth',block:'center'}),100)}if(b.hasAttribute('data-route-location')){if(!navigator.geolocation){alert('Este navegador no permite compartir ubicación.');return}navigator.geolocation.getCurrentPosition(position=>{routeOrigin=[position.coords.latitude,position.coords.longitude];routeMapMode='origin';render()},()=>alert('No se pudo obtener la ubicación. Puedes marcar la salida tocando el mapa.'),{enableHighAccuracy:true,timeout:10000,maximumAge:60000})}if(b.dataset.layer){hazardLayer=b.dataset.layer;render()}if(b.dataset.zone){selectedZone=b.dataset.zone;render()}if(b.dataset.clearShelters!==undefined){shelterQuery='';shelterStatus='';render();document.querySelector('#shelter-query').focus()}if(b.dataset.mode){mode=b.dataset.mode;render();document.querySelector('[data-mode="'+mode+'"]').focus()}if(b.dataset.zoom){zoom=Math.min(1.6,Math.max(1,zoom+Number(b.dataset.zoom)*.2));render()}if(b.dataset.step){let stage=Number(b.dataset.step);update(stage,incident?.count||35)}});
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
