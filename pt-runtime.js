// Priston Tale SMB animation evaluator (browser-side core)
// Mirrors EXEMesh.cpp's frame selection and interpolation model.
export class PTRuntime {
  constructor(data) { this.data=data; this.byName=new Map(data.bones.map(b=>[b.name,b])); }
  static mul(a,b){const o=new Array(16).fill(0);for(let r=0;r<4;r++)for(let c=0;c<4;c++)for(let k=0;k<4;k++)o[r*4+c]+=a[r*4+k]*b[k*4+c];return o;}
  static ident(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
  static qnorm(q){const n=Math.hypot(...q);return n?q.map(v=>v/n):[0,0,0,1];}
  static slerp(a,b,t){a=this.qnorm(a);b=this.qnorm(b);let d=a.reduce((s,v,i)=>s+v*b[i],0);if(d<0){b=b.map(v=>-v);d=-d;}if(d>.9995)return this.qnorm(a.map((v,i)=>v+t*(b[i]-v)));const th=Math.acos(Math.max(-1,Math.min(1,d))),s=Math.sin(th);return a.map((v,i)=>(Math.sin((1-t)*th)/s)*v+(Math.sin(t*th)/s)*b[i]);}
  static qmat(q){const [x,y,z,w]=this.qnorm(q),xx=x*x,yy=y*y,zz=z*z,xy=x*y,xz=x*z,yz=y*z,wx=w*x,wy=w*y,wz=w*z;return [1-2*(yy+zz),2*(xy+wz),2*(xz-wy),0,2*(xy-wz),1-2*(xx+zz),2*(yz+wx),0,2*(xz+wy),2*(yz-wx),1-2*(xx+yy),0,0,0,0,1];}
  frameBlock(b,f){/* slot 0 is the consolidated full timeline; PT sub-frame blocks start at slot 1 */for(let i=1;i<b.frames.length;i++){const x=b.frames[i];if(x[3]>0&&x[0]<=f&&f<x[1])return x;}const x=b.frames[0];return x&&x[0]<=f&&f<x[1]?x:null;}
  pair(arr,start,count,f){let lo=start,hi=Math.min(arr.length-1,start+count-1);if(lo<0||lo>=arr.length||hi<=lo)return null;while(lo<hi-1){const m=(lo+hi)>>1;if(arr[m][0]<=f)lo=m;else hi=m;}return [lo,Math.min(lo+1,arr.length-1)];}
  local(b,f){const block=this.frameBlock(b,f);if(!block)return PTRuntime.ident();const [s,e,start,count]=block;let m=PTRuntime.ident();const rp=this.pair(b.rot,0,b.rot.length,f);if(rp){const [i,j]=rp,a=b.rot[i],z=b.rot[j],den=z[0]-a[0],t=den?Math.max(0,Math.min(1,(f-a[0])/den)):0;
      // PT uses an accumulated previous-rotation matrix multiplied by an incremental quaternion.
      // v0=(0,0,0,0) in native code behaves as identity in its quaternion helper; identity->next reproduces that intent.
      const inc=PTRuntime.qmat(PTRuntime.slerp([0,0,0,1],z.slice(1),t));m=PTRuntime.mul(b.prevRotMatrix[i]||PTRuntime.ident(),inc);}
    // Position frame table has same segment boundaries; choose keys inside the segment directly.
    const ps=b.pos.filter(k=>s<=k[0]&&k[0]<=e);if(ps.length){let i=0;while(i+1<ps.length&&ps[i+1][0]<=f)i++;const a=ps[i],z=ps[Math.min(i+1,ps.length-1)],den=z[0]-a[0],t=den?(f-a[0])/den:0;m[12]=a[1]+(z[1]-a[1])*t;m[13]=a[2]+(z[2]-a[2])*t;m[14]=a[3]+(z[3]-a[3])*t;}
    return m;}
  pose(frame){const out=new Map();for(const b of this.data.bones){const local=this.local(b,frame),p=b.parent&&out.get(b.parent);out.set(b.name,p?PTRuntime.mul(local,p):local);}return out;}
}
