export type TeacherTab = 'live' | 'library' | 'studio';
export interface AppRoute {view:'teacher'|'student';roomCode:string;teacherTab:TeacherTab}
export function parseAppRoute(location:{pathname:string;search?:string;hash?:string}):AppRoute {
 const parts=location.pathname.toLowerCase().split('/').filter(Boolean);
 const params=new URLSearchParams(location.search||'');
 let code=(params.get('room')||params.get('roomId')||params.get('join')||'').trim().toUpperCase();
 const teacher=(tab:TeacherTab):AppRoute=>({view:'teacher',roomCode:'',teacherTab:tab});
 if(parts[0]==='teacher')return teacher(parts[1]==='library'||parts[1]==='studio'?parts[1]:'live');
 if(parts.length===1&&['live','library','studio'].includes(parts[0]))return teacher(parts[0] as TeacherTab);
 if(['student','join','learner'].includes(parts[0])){
  if(parts[1]&&!code){try{code=decodeURIComponent(parts[1]).trim().toUpperCase();}catch{code='';}}
  return {view:'student',roomCode:code,teacherTab:'live'};
 }
 const hash=location.hash||'';
 if(hash){
  const idx=hash.indexOf('?');const hp=new URLSearchParams(idx>=0?hash.slice(idx+1):hash.replace(/^#\/?/,''));
  const hc=hp.get('room')||hp.get('roomId')||hp.get('join');if(hc)code=hc.trim().toUpperCase();
  if(/student|learner|join/i.test(hash)||code)return {view:'student',roomCode:code,teacherTab:'live'};
 }
 return code?{view:'student',roomCode:code,teacherTab:'live'}:teacher('live');
}
export const teacherTabUrl=(tab:TeacherTab)=>`/teacher/${tab}`;
export function navigateApp(url:string){
 if(window.location.pathname+window.location.search+window.location.hash!==url)window.history.pushState({},'',url);
 window.dispatchEvent(new Event('app-route-change'));
}
