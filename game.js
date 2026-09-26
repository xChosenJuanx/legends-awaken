import * as THREE from 'three'; import {PTLoader} from '@fakl-code/pt-loader';
const $=s=>document.querySelector(s),canvas=$('#game'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x73866c);scene.fog=new THREE.FogExp2(0x73866c,.018);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,300),clock=new THREE.Clock();
scene.add(new THREE.HemisphereLight(0xffffff,0x273521,2));
const sun=new THREE.DirectionalLight(0xffffff,1.4);sun.position.set(10,20,8);scene.add(sun);
const fallbackGround=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshLambertMaterial({color:0x526d47}));
fallbackGround.rotation.x=-Math.PI/2;scene.add(fallbackGround);
const manifest=await fetch('./pt-assets/manifest.json').then(r=>r.json());
const loader=new PTLoader({baseUrl:'./pt-assets/',manifest,useWorker:true,options:{lighting:'unshaded',bindInverses:'pose'}});
let stage=null,terrainMeshes=[],terrainRay=new THREE.Raycaster(),terrainDown=new THREE.Vector3(0,-1,0),terrainNormal=new THREE.Vector3(),terrainLast=0,terrainReady=false;
// Terrain sampling uses the rendered stage geometry, not the full stage bounding-box minimum.
function terrainHeight(x,z,referenceY=0){if(!terrainMeshes.length)return null;terrainRay.set(new THREE.Vector3(x,1200,z),terrainDown);terrainRay.far=2400;const hits=terrainRay.intersectObjects(terrainMeshes,false);const walkable=[];for(const hit of hits){if(!hit.face)continue;terrainNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);if(terrainNormal.y>.48)walkable.push(hit.point.y)}if(!walkable.length)return null;walkable.sort((a,b)=>a-b);if(!terrainReady)return walkable[walkable.length-1];return walkable.reduce((a,b)=>Math.abs(b-referenceY)<Math.abs(a-referenceY)?b:a);}

try{$('#loadText').textContent='Loading actual Ancient World map…';stage=await loader.loadStage('field/AncientW/ancientW.smd');scene.add(stage);
 const b=new THREE.Box3().setFromObject(stage),sz=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3()),m=Math.max(sz.x,sz.z);
 if(isFinite(m)&&m>0){const sc=110/m;stage.scale.setScalar(sc);stage.position.set(-c.x*sc,-b.min.y*sc,-c.z*sc);fallbackGround.visible=false;stage.updateMatrixWorld(true);stage.traverse(o=>{if(o.isMesh&&o.geometry)terrainMeshes.push(o)});}
}catch(e){console.warn('Stage fallback',e)}
const player=new THREE.Group();scene.add(player);const visual=new THREE.Group();player.add(visual);
let ch,mixer,clips=[],rootBone=null,rootPose=null,current='',attackLock=0;
try{$('#loadText').textContent='Loading Knight + original animations…';ch=await loader.loadCharacter('char/monster/d_kn/dkn.inx');visual.add(ch.object);mixer=ch.createMixer();clips=ch.clipNames||[];
 // auto-size to human scale
 ch.object.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(ch.object),h=b.getSize(new THREE.Vector3()).y;let sc=(isFinite(h)&&h>0)?1.85/h:.018;ch.object.scale.setScalar(sc);ch.object.updateMatrixWorld(true);
 // lock skeleton root translation/rotation to bind pose: removes PT root-motion tumble/burying
 // Do not overwrite animated skeleton bone transforms: PTLoader owns them.
 rootBone=null;rootPose=null;
 // One-time feet alignment only. Never re-snap the animated mesh every frame.
 groundVisual();
 const spawnY=terrainHeight(0,0,0);if(spawnY!==null){player.position.y=spawnY;terrainReady=true;$('#debug').textContent='Terrain spawn Y: '+spawnY.toFixed(2)}
 play(find(['idle','stand'])||clips[0],0);$('#debug').textContent='Knight clips: '+clips.join(' • ')+' | terrain meshes: '+terrainMeshes.length;
}catch(e){$('#loadText').textContent='Knight error: '+e.message;throw e}
function find(a){for(const w of a){const n=clips.find(x=>x.toLowerCase().includes(w));if(n)return n}}
function play(n,fade=.12){if(!n||n===current)return;for(const a of mixer._actions||[])if(a.isRunning())a.fadeOut(fade);const a=ch.play(n,mixer);if(a){a.reset().fadeIn(fade).play();current=n}}
function groundVisual(){visual.position.y=0;ch.object.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(ch.object);if(isFinite(b.min.y))visual.position.y=-b.min.y+.02}
const mobs=[],mobGeo=new THREE.CapsuleGeometry(.45,.9,5,8),mobMat=[0x577e35,0x6d4c38,0x59636c,0x754b35];
for(let i=0;i<14;i++){const g=new THREE.Group(),body=new THREE.Mesh(mobGeo,new THREE.MeshLambertMaterial({color:mobMat[i%4]}));body.position.y=.9;g.add(body);
 const eye=new THREE.Mesh(new THREE.SphereGeometry(.07,6,6),new THREE.MeshBasicMaterial({color:0xffd56a}));eye.position.set(.18,1.25,.38);g.add(eye);const e2=eye.clone();e2.position.x=-.18;g.add(e2);
 let a=Math.random()*Math.PI*2,r=10+Math.random()*32;g.position.set(Math.cos(a)*r,0,Math.sin(a)*r);scene.add(g);mobs.push({o:g,hp:80,max:80,name:['Goblin','Skeleton','Wolf','Ancient Guard'][i%4],dead:0});}
let target=null,kills=0,level=1,xp=0,hp=100,gold=0;
function nearest(range=3){let best=null,d=range;for(const m of mobs){if(m.dead)continue;let x=m.o.position.distanceTo(player.position);if(x<d){d=x;best=m}}return best}
function setTarget(m){target=m;$('#target').classList.toggle('hide',!m);if(m){$('#targetName').textContent=m.name;$('#targetHp').style.width=(m.hp/m.max*100)+'%'}}
function particles(pos){for(let i=0;i<12;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.035,4,4),new THREE.MeshBasicMaterial({color:0xffc34f}));p.position.copy(pos).add(new THREE.Vector3(0,1,0));p.userData.v=new THREE.Vector3((Math.random()-.5)*3,Math.random()*3,(Math.random()-.5)*3);p.userData.life=.45;scene.add(p);fx.push(p)}}
const fx=[];
function hit(mult=1){if(attackLock>0)return;let m=nearest(3.2);if(!m){notice('No target in range');return}setTarget(m);attackLock=.55;play(find(['attack'])||clips[0]);particles(m.o.position);let dmg=Math.round((18+level*3)*mult);m.hp-=dmg;notice('-'+dmg);
 if(m.hp<=0){m.dead=3;m.o.visible=false;kills++;xp+=35;gold+=20;$('#questText').textContent='Defeat monsters '+Math.min(kills,10)+' / 10';if(xp>=level*100){xp-=level*100;level++;$('#lv').textContent=level;notice('LEVEL UP!')}if(kills===10){gold+=500;xp+=100;notice('MISSION COMPLETE +500 GOLD')}}setTarget(m.hp>0?m:null);ui()}
function skill(i){hit([1,1.6,2.1,2.7][i]||1)}
function notice(t){$('#notice').textContent=t;clearTimeout(notice.t);notice.t=setTimeout(()=>$('#notice').textContent='',700)}
function ui(){$('#hp').style.width=hp+'%';$('#hpt').textContent=Math.round(hp)+' / 100';$('#xp').style.width=Math.min(100,xp/(level*100)*100)+'%';if(target)$('#targetHp').style.width=Math.max(0,target.hp/target.max*100)+'%'}
document.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>skill(+b.dataset.skill));$('#potion').onclick=()=>{hp=Math.min(100,hp+40);ui();notice('+40 HP')};$('#fullscreen').onclick=()=>document.documentElement.requestFullscreen?.();
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.code==='Space'){e.preventDefault();skill(0)}if(['1','2','3'].includes(e.key))skill(+e.key);if(e.key.toLowerCase()==='q')$('#potion').click()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
let joy={on:false,x:0,y:0},J=$('#joy'),S=$('#stick');function jm(e){let r=J.getBoundingClientRect(),t=e.touches[0],x=t.clientX-r.left-62.5,y=t.clientY-r.top-62.5,l=Math.hypot(x,y)||1,q=Math.min(36,l);joy.x=x/l;joy.y=y/l;S.style.transform=`translate(${joy.x*q}px,${joy.y*q}px)`}
J.addEventListener('touchstart',e=>{joy.on=1;jm(e)},{passive:true});J.addEventListener('touchmove',jm,{passive:true});J.addEventListener('touchend',()=>{joy.on=0;joy.x=joy.y=0;S.style.transform=''});
let camYaw=Math.PI,drag=false,lx=0;canvas.addEventListener('pointerdown',e=>{drag=1;lx=e.clientX});canvas.addEventListener('pointermove',e=>{if(drag){camYaw-=(e.clientX-lx)*.006;lx=e.clientX}});addEventListener('pointerup',()=>drag=0);
$('#loading').style.display='none';ui();
function loop(){
 const dt=Math.min(clock.getDelta(),.04),elapsed=clock.elapsedTime;attackLock=Math.max(0,attackLock-dt);
 let x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),z=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);if(joy.on){x=joy.x;z=joy.y}
 let moving=Math.hypot(x,z)>.12;
 if(moving){let l=Math.hypot(x,z),wx=(x*Math.cos(camYaw)+z*Math.sin(camYaw))/l,wz=(-x*Math.sin(camYaw)+z*Math.cos(camYaw))/l;player.position.x+=wx*4.2*dt;player.position.z+=wz*4.2*dt;player.rotation.y=Math.atan2(wx,wz);if(attackLock<=0)play(find(['run','walk'])||clips[0]);}
 else if(attackLock<=0)play(find(['idle','stand'])||clips[0]);
 mixer.update(dt);
 // Critical stabilization after every animation update.
 // PTLoader animation controls the skeleton; do not reset pelvis/root each frame.
 if(terrainMeshes.length && elapsed-terrainLast>.09){terrainLast=elapsed;const y=terrainHeight(player.position.x,player.position.z,player.position.y);if(y!==null){terrainReady=true;player.position.y+=(y-player.position.y)*Math.min(1,dt*18);}}
 for(const m of mobs){if(m.dead){m.dead-=dt;if(m.dead<=0){m.hp=m.max;m.o.visible=true;let a=Math.random()*6.28,r=18+Math.random()*25;m.o.position.set(Math.cos(a)*r,0,Math.sin(a)*r)}continue}let d=m.o.position.distanceTo(player.position);if(d<8&&d>1.4){m.o.position.lerp(player.position,dt*.18);m.o.lookAt(player.position.x,0,player.position.z)}if(d<1.6&&Math.random()<dt*.25){hp=Math.max(0,hp-5);ui();if(hp<=0){hp=100;player.position.set(0,0,0);notice('RESPAWNED');ui()}}}
 for(let i=fx.length-1;i>=0;i--){let p=fx[i];p.userData.life-=dt;p.position.addScaledVector(p.userData.v,dt);p.userData.v.y-=5*dt;if(p.userData.life<=0){scene.remove(p);fx.splice(i,1)}}
 loader.update(elapsed);
 const p=player.position,dist=6.2;camera.position.lerp(new THREE.Vector3(p.x+Math.sin(camYaw)*dist,p.y+3.6,p.z+Math.cos(camYaw)*dist),.12);camera.lookAt(p.x,p.y+1.25,p.z);
 renderer.render(scene,camera);requestAnimationFrame(loop)
}loop();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js');