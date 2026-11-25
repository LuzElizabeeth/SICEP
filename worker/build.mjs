import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const files=['index.html','app.js','style.css','assets/cholula.png','assets/sicep-symbol.png','assets/cholula-map.png'];
const assets=Object.fromEntries(files.map(file=>['/'+file,readFileSync('dist/'+file).toString('base64')]));
mkdirSync('dist/server',{recursive:true});
writeFileSync('dist/server/index.js',readFileSync('worker/api.js','utf8')+'\n'+readFileSync('worker/bulletins.mjs','utf8')+'\nconst snapshot='+readFileSync('worker/snapshot.json','utf8')+';\nconst assets='+JSON.stringify(assets)+`;
export default {async fetch(request, env){
  const path=new URL(request.url).pathname;
  if(path==='/api/boletines')return bulletins(request);
  if(path==='/api/situation')return state(request,env.DB);
  const key=path==='/'?'/index.html':path;
  if(!Object.hasOwn(assets,key))return new Response(null,{status:404});
  const type={js:'text/javascript',css:'text/css',html:'text/html',png:'image/png'}[key.split('.').pop()];
  return new Response(Uint8Array.from(atob(assets[key]),c=>c.charCodeAt(0)),{headers:{'Content-Type':type,'Cache-Control':'no-cache'}});
}};
`);
