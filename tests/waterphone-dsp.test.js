// Lumatable: the waterphone model, numerically (strike, bow, water bending, stress, faces, speed).   node tests/waterphone-dsp.test.js
const fs=require('fs');
const path=require('path'); const html=fs.readFileSync(path.join(__dirname,'..','prototype','index.html'),'utf8');
const core=html.slice(html.indexOf('const DSP_CORE = String.raw`')+'const DSP_CORE = String.raw`'.length, html.indexOf('`;\nconst WORKLET_SRC'));
const wp='';
const W=new Function(core+'\n'+wp+'\nreturn Waterphone;')();
const sr=48000;
const rms=(a,s,e)=>{ s=Math.floor(s); e=Math.floor(e); let x=0; for(let i=s;i<e;i++) x+=a[i]*a[i]; return Math.sqrt(x/(e-s)); };
const peak=a=>{ let p=0; for(const v of a) p=Math.max(p,Math.abs(v)); return p; };
function run(w, secs, fn){ const N=Math.floor(sr*secs), out=new Float32Array(N); const blk=128; for(let i=0;i<N;i+=blk){ if(fn) fn(i/sr, w); w.process(out.subarray(i,Math.min(N,i+blk)), Math.min(blk,N-i), i/sr); } return out; }
// spectral peak finder (Goertzel on a list of candidate freqs)
function goertzel(a,s,e,f){ s=Math.floor(s); e=Math.floor(e); const w=2*Math.PI*f/sr, c=2*Math.cos(w); let s0=0,s1=0,s2=0; for(let i=s;i<e;i++){ s0=a[i]+c*s1-s2; s2=s1; s1=s0; } return Math.sqrt(s1*s1+s2*s2-c*s1*s2)/(e-s); }
function bestFreq(a,s,e,lo,hi,step){ let bf=lo,bv=0; for(let f=lo;f<=hi;f+=step){ const v=goertzel(a,s,e,f); if(v>bv){ bv=v; bf=f; } } return {f:bf,v:bv}; }
let ok=true; const say=(n,c,i)=>{ console.log((c?'PASS ':'FAIL ')+n+(i?' · '+i:'')); ok=ok&&c; };

// 1. a strike on rod 3 rings long and inharmonic
{ const w=new W(sr); w.handle({type:'cfg',water:0}); w.handle({type:'strike',rod:3,vel:0.7});
  const out=run(w,4);
  const p=peak(out), r0=rms(out,sr*0.05,sr*0.3), r2=rms(out,sr*2,sr*2.5), r35=rms(out,sr*3.5,sr*4);
  const f0=w.rods[3].modes[0].f, f1=w.rods[3].modes[1].f;
  const a=goertzel(out,sr*0.3,sr*1.3,f0), b=goertzel(out,sr*0.3,sr*1.3,f1), off=goertzel(out,sr*0.3,sr*1.3,f0*1.5);
  say('strike: level sane, rings for seconds, rod partials 1 and 6.27 present', p>0.15 && p<0.95 && r2>r0*0.08 && r35<r2 && a>off*4 && b>off*1.5, JSON.stringify({p:+p.toFixed(2),r0:+r0.toFixed(3),r2:+r2.toFixed(3),r35:+r35.toFixed(4),a:+a.toExponential(2),b:+b.toExponential(2),off:+off.toExponential(2)})); }
// 2. bowing sustains at a stable level and stops after release
{ const w=new W(sr); w.handle({type:'cfg',water:0}); w.handle({type:'bow',rod:5,on:true,press:0.6,speed:0.3});
  const out=run(w,4,(t,w)=>{ if(Math.abs(t-2.5)<0.002) w.handle({type:'bow',rod:5,on:false}); });
  const r1=rms(out,sr*1.5,sr*2), r2=rms(out,sr*2.2,sr*2.5), r38=rms(out,sr*3.7,sr*4), p=peak(out);
  const f0=w.rods[5].modes[0].f; const bf=bestFreq(out,sr*1,sr*2,f0*0.9,f0*1.1,0.5);
  say('bow: sustains at a musical level, sings the rod, decays after release', r1>0.1 && r1<0.7 && Math.abs(r2-r1)<r1*0.4 && r38<r2*0.35 && Math.abs(bf.f-f0)<3 && p<1, JSON.stringify({r1:+r1.toFixed(3),r2:+r2.toFixed(3),r38:+r38.toFixed(4),p:+p.toFixed(2),f0:+f0.toFixed(1),bf:bf.f})); }
// 3. water: a slosh bends the bowl's modes and the bowed rod glides with them
{ const w=new W(sr); w.handle({type:'cfg',water:0.8}); w.handle({type:'bow',rod:2,on:true,press:0.6,speed:0.3});
  const still=[w.bowl[0].f, w.rods[2].modes[0].f]; const seen=[];
  run(w,3,(t,w)=>{ if(Math.abs(t-1.0)<0.002) w.handle({type:'slosh',v:5}); if(t>1.05 && t<2.5) seen.push([w.ws, w.bowl[0].f, w.rods[2].modes[0].f]); });
  const maxWs=Math.max(...seen.map(x=>Math.abs(x[0]))), bowlDev=Math.max(...seen.map(x=>Math.abs(x[1]-still[0])))/still[0], rodDev=Math.max(...seen.map(x=>Math.abs(x[2]-still[1])))/still[1];
  const signs=new Set(seen.map(x=>Math.sign(x[0]))); 
  say('water: a slosh swings for seconds and bends the bowl by several % and the bowed rod by ~1-4 %', maxWs>0.4 && bowlDev>0.04 && rodDev>0.01 && rodDev<0.08 && signs.size>=2, JSON.stringify({maxWs:+maxWs.toFixed(2),bowlDev:+bowlDev.toFixed(3),rodDev:+rodDev.toFixed(3),swings:signs.size})); }
// 4. worst case: everything bowed hard plus strikes does not blow up
{ const w=new W(sr); w.handle({type:'cfg',water:1,face:1}); for(let k=0;k<10;k++) w.handle({type:'bow',rod:k,on:true,press:1,speed:1});
  const out=run(w,3,(t,w)=>{ if((Math.round(t*100)%25)===0) w.handle({type:'strike',rod:-1,vel:1}); });
  const p=peak(out); say('stress: ten bows, dome strikes, storm face stay bounded', p<=1.0 && Number.isFinite(p) && rms(out,sr*2,sr*3)>0.05, 'peak='+p.toFixed(3)+' rms='+rms(out,sr*2,sr*3).toFixed(3)); }
// 5. faces: GHOST bows the second partial; GONG strike is bowl-heavy and longer
{ const w=new W(sr); w.handle({type:'cfg',water:0.3,face:3}); w.handle({type:'bow',rod:4,on:true,press:0.6,speed:0.2});
  const out=run(w,3); const f0=w.rods[4].modes[0].f, f1=w.rods[4].modes[1].f;
  const a=goertzel(out,sr*2,sr*3,f0), b=goertzel(out,sr*2,sr*3,f1);
  const g=new W(sr); g.handle({type:'cfg',water:0.3,face:2}); g.handle({type:'strike',rod:-1,vel:0.8}); const o2=run(g,3);
  const bowl=goertzel(o2,sr*0.3,sr*1,g.bowl[0].f), rod=goertzel(o2,sr*0.3,sr*1,g.rods[0].modes[0].f);
  say('faces: ghost sings the second partial; gong strike rings the bowl', b>a*1.5 && bowl>rod*2, JSON.stringify({a:+a.toExponential(2),b:+b.toExponential(2),bowl:+bowl.toExponential(2),rod:+rod.toExponential(2)})); }
// 6. speed: a block of 128 samples well under its real-time budget
{ const w=new W(sr); for(let k=0;k<3;k++) w.handle({type:'bow',rod:k,on:true,press:0.6}); w.handle({type:'strike',rod:2,vel:0.8});
  const out=new Float32Array(128); const t0=process.hrtime.bigint(); for(let i=0;i<2000;i++) w.process(out,128,i*128/sr); const ms=Number(process.hrtime.bigint()-t0)/1e6;
  say('speed: 2000 blocks (5.3 s of audio)', ms<2000, ms.toFixed(0)+' ms → '+(ms/5333*100).toFixed(1)+'% of real time'); }
process.exit(ok?0:1);
