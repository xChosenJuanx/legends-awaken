import {PTRuntime} from './pt-runtime.js';
const [clips,body,bind]=await Promise.all(['clips.json','body.json','bind.json'].map(x=>fetch(x).then(r=>r.json())));
const ids=Object.keys(clips.segments),sel=document.querySelector('#seg'),c=document.querySelector('#c'),ctx=c.getContext('2d'),stat=document.querySelector('#stat');
for(const id of ids){const o=document.createElement('option');o.value=id;o.textContent=`Segment ${id} (${clips.segments[id].logicalFrames||Math.round((clips.segments[id].end-clips.segments[id].start)/160)}f)`;sel.append(o)}
let playing=true,frame=0,last=performance.now(),yaw=-0.55,pitch=0.08,drag=false,lx=0,ly=0,cache=null;
function resize(){c.width=innerWidth*devicePixelRatio;c.height=innerHeight*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)} addEventListener('resize',resize);resize();
function tr(v,m){return [v[0]*m[0]+v[1]*m[4]+v[2]*m[8]+m[12],v[0]*m[1]+v[1]*m[5]+v[2]*m[9]+m[13],v[0]*m[2]+v[1]*m[6]+v[2]*m[10]+m[14]]}
function setSegment(){const s=clips.segments[sel.value];cache={s,rt:new PTRuntime({bones:s.bones.map(b=>({...b,frames:[b.frame]}))})};frame=s.start} sel.onchange=setSegment;setSegment();
play.onclick=()=>{playing=!playing;play.textContent=playing?'Pause':'Play'};prev.onclick=()=>{playing=false;play.textContent='Play';frame-=160};next.onclick=()=>{playing=false;play.textContent='Play';frame+=160};
c.onpointerdown=e=>{drag=true;lx=e.clientX;ly=e.clientY;c.setPointerCapture(e.pointerId)};c.onpointermove=e=>{if(!drag)return;yaw+=(e.clientX-lx)*.008;pitch=Math.max(-.8,Math.min(.8,pitch+(e.clientY-ly)*.006));lx=e.clientX;ly=e.clientY};c.onpointerup=c.onpointercancel=()=>drag=false;
function camera(p){let [x,y,z]=p;const cy=Math.cos(yaw),sy=Math.sin(yaw);[x,z]=[x*cy-z*sy,x*sy+z*cy];const cp=Math.cos(pitch),sp=Math.sin(pitch);[y,z]=[y*cp-z*sp,y*sp+z*cp];return [x,y,z]}
function loop(now){const {s,rt}=cache;if(frame<s.start||frame>=s.end)frame=s.start;if(playing){frame+=(now-last)*9.6*+speed.value;if(frame>=s.end)frame=s.start+(frame-s.start)%(s.end-s.start)}last=now;
 const pose=rt.pose(frame),tris=[];let minY=1e9,maxY=-1e9;
 for(const o of body.objects){const vv=o.vertices.map((v,i)=>{const bn=o.physique[i],pm=pose.get(bn),bi=bind[bn]?.inv;// PT physique vertices are stored in the assigned bone's local space.
      // Applying inverse-bind again double-transforms them and causes the 'spaghetti' deformation.
      const w=pm?tr(v,pm):v;minY=Math.min(minY,w[1]);maxY=Math.max(maxY,w[1]);return camera(w)});for(const f of o.faces){const a=vv[f[0]],b=vv[f[1]],d=vv[f[2]];if(a&&b&&d)tris.push({p:[a,b,d],z:(a[2]+b[2]+d[2])/3})}}
 tris.sort((a,b)=>a.z-b.z);ctx.clearRect(0,0,innerWidth,innerHeight);const h=Math.max(1,maxY-minY),sc=Math.min(innerHeight*.72/h,55),ox=innerWidth/2,oy=innerHeight*.82;ctx.lineWidth=1;ctx.strokeStyle='#d9dde7';
 for(const t of tris){ctx.beginPath();ctx.moveTo(ox+t.p[0][0]*sc,oy-t.p[0][1]*sc);ctx.lineTo(ox+t.p[1][0]*sc,oy-t.p[1][1]*sc);ctx.lineTo(ox+t.p[2][0]*sc,oy-t.p[2][1]*sc);ctx.closePath();ctx.stroke()}
 stat.textContent=`Segment ${sel.value} | PT ${Math.floor(frame)} | logical ${Math.floor(frame/160)} | ${tris.length} faces | drag to rotate`;requestAnimationFrame(loop)} requestAnimationFrame(loop);
