import * as THREE from 'three';
import { PTLoader } from '@fakl-code/pt-loader';

const canvas=document.querySelector('#game'), status=document.querySelector('#status'), load=document.querySelector('#loading'), loadText=document.querySelector('#loadText'), animLabel=document.querySelector('#anim');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x78956f);scene.fog=new THREE.Fog(0x78956f,18,70);
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,200);camera.position.set(0,4.2,7);
scene.add(new THREE.HemisphereLight(0xffffff,0x33452f,2.2));
const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(6,12,4);scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100,30,30),new THREE.MeshLambertMaterial({color:0x466442}));ground.rotation.x=-Math.PI/2;scene.add(ground);
const grid=new THREE.GridHelper(100,50,0x2f4930,0x587457);grid.position.y=.01;scene.add(grid);
for(let i=0;i<45;i++){const t=new THREE.Mesh(new THREE.ConeGeometry(.45+Math.random()*.45,2.5+Math.random()*2,7),new THREE.MeshLambertMaterial({color:0x294b2b}));t.position.set((Math.random()-.5)*75,1.4,(Math.random()-.5)*75);if(Math.abs(t.position.x)<6&&Math.abs(t.position.z)<6)t.position.x+=10;scene.add(t)}

let character=null,mixer=null,clips=[],clipIndex=0,current='',yaw=0,drag=false,lastX=0;
const keys={}; let joy={active:false,x:0,y:0};
const loaderManifest=await fetch('./pt-assets/manifest.json').then(r=>r.json());
const pt=new PTLoader({baseUrl:'./pt-assets/',manifest:loaderManifest,options:{lighting:'unshaded',bindInverses:'pose'}});

function say(s){status.textContent=s}
function findClip(words){for(const w of words){let x=clips.find(n=>n.toLowerCase().includes(w));if(x)return x}return null}
function play(name,fade=.16){if(!character||!name||name===current)return;const old=mixer?mixer._actions.find(a=>a.isRunning()):null;let a=character.play(name,mixer);if(a){if(old&&old!==a){a.reset();a.fadeIn(fade);old.fadeOut(fade)}current=name;animLabel.textContent='Animation: '+name}}
try{
 loadText.textContent='Parsing dkn.inx / dkn.smd / dkn.smb…';
 character=await pt.loadCharacter('char/monster/d_kn/dkn.inx');
 scene.add(character.object);
 character.object.scale.setScalar(.018);
 character.object.position.set(0,0,0);
 mixer=character.createMixer();clips=character.clipNames||[];
 say('Actual Knight loaded. Clips: '+(clips.join(', ')||'No named clips found'));
 let idle=findClip(['idle','stand'])||clips[0]; if(idle)play(idle,0);
 load.style.display='none';
}catch(e){
 console.error(e); loadText.textContent='Knight loader error — '+e.message;
 say('Open DevTools Console and send me the exact error if this remains on screen.');
}

addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.code==='Space'){e.preventDefault();attack()}if(e.key==='1')cycle()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
function attack(){let a=findClip(['attack','atk','skill']);if(a){play(a);setTimeout(()=>play(findClip(['idle','stand'])||clips[0]),700)}}
function cycle(){if(!clips.length)return;clipIndex=(clipIndex+1)%clips.length;play(clips[clipIndex]);say('Clip '+(clipIndex+1)+'/'+clips.length+': '+clips[clipIndex])}
document.querySelector('#attack').onclick=attack;document.querySelector('#cycle').onclick=cycle;document.querySelector('#fs').onclick=()=>document.documentElement.requestFullscreen?.();

canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(drag){yaw-=(e.clientX-lastX)*.006;lastX=e.clientX}});
canvas.addEventListener('pointerup',()=>drag=false);

const j=document.querySelector('#joy'),stick=document.querySelector('#stick');
function je(e){let r=j.getBoundingClientRect(),t=e.touches[0],dx=t.clientX-(r.left+60),dy=t.clientY-(r.top+60),l=Math.hypot(dx,dy)||1,m=Math.min(35,l);joy.x=dx/l;joy.y=dy/l;stick.style.transform=`translate(${joy.x*m}px,${joy.y*m}px)`}
j.addEventListener('touchstart',e=>{joy.active=true;je(e)},{passive:true});j.addEventListener('touchmove',je,{passive:true});j.addEventListener('touchend',()=>{joy.active=false;joy.x=joy.y=0;stick.style.transform=''});
const clock=new THREE.Clock();
function frame(){
 const dt=Math.min(clock.getDelta(),.05),elapsed=clock.elapsedTime;
 if(character){
  let x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),z=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  if(joy.active){x=joy.x;z=joy.y}
  let moving=Math.hypot(x,z)>.1,run=keys.shift;
  if(moving){
   let a=yaw,wx=x*Math.cos(a)+z*Math.sin(a),wz=-x*Math.sin(a)+z*Math.cos(a),l=Math.hypot(wx,wz)||1,s=(run?5:3)*dt;
   character.object.position.x+=wx/l*s;character.object.position.z+=wz/l*s;
   character.object.rotation.y=Math.atan2(wx/l,wz/l);
   if(!current.toLowerCase().includes('attack')) play(findClip(run?['run','walk']:['walk','run'])||findClip(['idle'])||clips[0]);
  }else if(!current.toLowerCase().includes('attack'))play(findClip(['idle','stand'])||clips[0]);
  mixer?.update(dt);pt.update(elapsed);
  const pos=character.object.position,rad=7;
  camera.position.set(pos.x+Math.sin(yaw)*rad,pos.y+3.7,pos.z+Math.cos(yaw)*rad);camera.lookAt(pos.x,pos.y+1.4,pos.z);
 }
 renderer.render(scene,camera);requestAnimationFrame(frame)
}frame();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js');
