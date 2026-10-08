import {test} from 'node:test';import assert from 'node:assert/strict';import {parseAppRoute,teacherTabUrl} from './appRoutes';
test('teacher endpoints and aliases restore the correct tab',()=>{
 for(const tab of ['live','library','studio'] as const){for(const pathname of [teacherTabUrl(tab),`/${tab}`])assert.deepEqual(parseAppRoute({pathname}),{view:'teacher',roomCode:'',teacherTab:tab});}
 assert.equal(parseAppRoute({pathname:'/teacher/library',search:'?room=CH-TEST'}).view,'teacher');
});
test('learner path, query and legacy hash links remain supported',()=>{
 for(const location of [{pathname:'/student/ch-test'},{pathname:'/join/CH-TEST'},{pathname:'/learner',search:'?room=ch-test'},{pathname:'/',search:'?join=ch-test'},{pathname:'/',hash:'#/student?room=ch-test'},{pathname:'/',hash:'#room=ch-test'}])assert.equal(parseAppRoute(location).roomCode,'CH-TEST');
 assert.equal(parseAppRoute({pathname:'/student/%invalid'}).view,'student');
 assert.equal(parseAppRoute({pathname:'/student-other'}).view,'teacher');
});
