// PT animation evaluator ported from PTEU EXEMesh.cpp / EXEMatrix.cpp.
export class PTRuntime {
 constructor(data){this.data=data;}
 static mul(a,b){const o=new Array(16).fill(0);for(let r=0;r<4;r++)for(let c=0;c<4;c++)for(let k=0;k<4;k++)o[r*4+c]+=a[r*4+k]*b[k*4+c];return o;}
 static ident(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
 // Exact EXEQuaternionSlerp behavior used by PT: v0 is ZERO, not identity, and result is NOT normalized.
 static ptSlerpZero(v1,t){let dot=0; if(dot<0){dot=-dot;} if(dot>.9995){return v1.map(v=>v*t);} const theta=Math.acos(Math.max(-1,Math.min(1,dot)))*t; return v1.map(v=>v*Math.sin(theta));}
 // Exact EXEMatrixFromQuaterion sign/layout (row-major PT matrix).
 static qmat(q){const [x,y,z,w]=q,xx=x*x,yy=y*y,zz=z*z,xy=x*y,xz=x*z,yz=y*z,wx=w*x,wy=w*y,wz=w*z;return [1-2*(yy+zz),2*(xy-wz),2*(xz+wy),0,2*(xy+wz),1-2*(xx+zz),2*(yz-wx),0,2*(xz-wy),2*(yz+wx),1-2*(xx+yy),0,0,0,0,1];}
 pair(arr,f){if(!arr||arr.length<2||arr[0][0]>f)return null;for(let i=0;i+1<arr.length;i++)if(arr[i][0]<=f&&arr[i+1][0]>f)return [i,i+1];return null;}
 local(b,f){let m=PTRuntime.ident();const rp=this.pair(b.rot,f);if(rp){const [i,j]=rp,a=b.rot[i],z=b.rot[j],den=z[0]-a[0],t=den?(f-a[0])/den:0;const inc=PTRuntime.qmat(PTRuntime.ptSlerpZero(z.slice(1),t));m=PTRuntime.mul(b.prevRotMatrix[i]||PTRuntime.ident(),inc);}
  const pp=this.pair(b.pos,f);if(pp){const [i,j]=pp,a=b.pos[i],z=b.pos[j],den=z[0]-a[0],t=den?(f-a[0])/den:0;m[12]=a[1]+(z[1]-a[1])*t;m[13]=a[2]+(z[2]-a[2])*t;m[14]=a[3]+(z[3]-a[3])*t;}
  const sp=this.pair(b.scale,f);if(sp){const [i,j]=sp,a=b.scale[i],z=b.scale[j],den=z[0]-a[0],t=den?(f-a[0])/den:0;const sx=(a[1]+(z[1]-a[1])*t)/256,sy=(a[2]+(z[2]-a[2])*t)/256,sz=(a[3]+(z[3]-a[3])*t)/256;const sm=[sx,0,0,0,0,sy,0,0,0,0,sz,0,0,0,0,1];m=PTRuntime.mul(m,sm);}
  return m;}
 pose(frame){const out=new Map();for(const b of this.data.bones){const local=this.local(b,frame),p=b.parent&&out.get(b.parent);out.set(b.name,p?PTRuntime.mul(local,p):local);}return out;}
}
