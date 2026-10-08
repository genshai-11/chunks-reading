import {useEffect,useState} from 'react';
import {navigateApp,parseAppRoute,teacherTabUrl,type TeacherTab} from '../utils/appRoutes';
export function useTeacherTabRoute():[TeacherTab,(tab:TeacherTab)=>void]{
 const [tab,setTab]=useState<TeacherTab>(()=>parseAppRoute(window.location).teacherTab);
 useEffect(()=>{
  const changed=()=>{const route=parseAppRoute(window.location);if(route.view==='teacher')setTab(route.teacherTab);};
  for(const event of ['popstate','hashchange','app-route-change'])window.addEventListener(event,changed);
  return()=>{for(const event of ['popstate','hashchange','app-route-change'])window.removeEventListener(event,changed);};
 },[]);
 return [tab,next=>{setTab(next);navigateApp(teacherTabUrl(next));}];
}
