// Lumatable: the bodies kit's new voice faces, numerically: TUNED (a pitch pull), the warp body's FREEZE and STUTTER on a live voice, express GROWL, the envelope's PERC.   node tests/kit-dsp.test.js
const fs=require('fs');
const path=require('path'); const html=fs.readFileSync(path.join(__dirname,'..','prototype','index.html'),'utf8');
const core=html.slice(html.indexOf('const DSP_CORE = String.raw`')+'const DSP_CORE = String.raw`'.length, html.indexOf('`;\nconst WORKLET_SRC'));
const LW=new Function(core+'\nreturn VoiceFx;')();
const sr=48000;
const rms=(a,s,e)=>{ s=Math.floor(s); e=Math.floor(e); let x=0; for(let i=s;i<e;i++) x+=a[i]*a[i]; return Math.sqrt(x/(e-s)); };
const peak=a=>{ let p=0; for(const v of a) p=Math.max(p,Math.abs(v)); return p; };
function goertzel(a,s,e,f){ s=Math.floor(s); e=Math.floor(e); const w=2*Math.PI*f/sr, c=2*Math.cos(w); let s0=0,s1=0,s2=0; for(let i=s;i<e;i++){ s0=a[i]+c*s1-s2; s2=s1; s1=s0; } return Math.sqrt(s1*s1+s2*s2-c*s1*s2)/(e-s); }
function band(a,s,e,f){ let v=0; for(let k=-8;k<=8;k++) v+=goertzel(a,s,e,f*(1+k*0.01)); return v; }
const CANDS=[110,146.8,165,220,293.7,330,440,880];
function bestFreq(a,s,e){ let bf=0,bv=0; const acc={}; for(const f of CANDS){ const v=band(a,s,e,f); acc[f]=+v.toExponential(2); if(v>bv){ bv=v; bf=f; } } return {f:bf,v:bv,acc}; }
/* a tone from `on` to `off` seconds, silence elsewhere; `each(w,t)` runs before every block */
function run(cfg, secs, hz, opts={}){
  const w=new LW(sr); w.handle({type:'cfg',cfg}); const N=Math.floor(sr*secs), inp=new Float32Array(N), out=new Float32Array(N);
  const on=(opts.on||0)*sr, off=(opts.off==null ? secs : opts.off)*sr;
  for(let i=0;i<N;i++) inp[i]=(i>=on && i<off) ? 0.5*Math.sin(2*Math.PI*hz*i/sr) : 0;
  for(let i=0;i<N;i+=128){ if(opts.each) opts.each(w, i/sr); w.process(inp.subarray(i,i+128), out.subarray(i,i+128), Math.min(128,N-i), i/sr); }
  return { inp, out, w };
}
let ok=true; const say=(n,c,i)=>{ console.log((c?'PASS ':'FAIL ')+n+(i?' · '+i:'')); ok=ok&&c; };

// 1. TUNED: a pull of +12 semitones (the extreme the mic face would ask for) takes 220 to 440; a pull of 0 leaves it
{ const { out } = run({tune:12, grain:0.08}, 1.5, 220);
  const b=bestFreq(out,sr*0.5,sr*1.4), at220=band(out,sr*0.5,sr*1.4,220), at440=band(out,sr*0.5,sr*1.4,440);
  const { out:o2 } = run({tune:0, grain:0.08}, 1, 220); const b2=bestFreq(o2,sr*0.3,sr*0.9);
  say('TUNED: tune +12 st takes 220 Hz to 440 Hz; tune 0 leaves it at 220', b.f===440 && at440>at220*3 && b2.f===220, JSON.stringify({f:b.f,at220:+at220.toExponential(2),at440:+at440.toExponential(2),f0:b2.f})); }
// 2. FREEZE: the voice stops at 0.6 s but the frozen grain keeps sounding, at pitch, for as long as we like
{ const { out } = run({grain:0.08}, 2, 220, { off:0.6, each:(w,t)=>{ if(t>=0.5 && !w.cfg.freeze) w.handle({type:'cfg',cfg:{freeze:true}}); } });
  const live=rms(out,sr*0.2,sr*0.5), held=rms(out,sr*1.2,sr*1.9), b=bestFreq(out,sr*1.2,sr*1.9);
  const { out:o2 } = run({grain:0.08}, 2, 220, { off:0.6 }); const plain=rms(o2,sr*1.2,sr*1.9);
  say('FREEZE: a grain frozen at 0.5 s still sounds at 220 Hz over a second after the voice stopped; without freeze there is silence', held>0.15 && held>plain*20 && b.f===220 && peak(out)<0.9, JSON.stringify({live:+live.toFixed(3),held:+held.toFixed(3),plain:+plain.toExponential(2),f:b.f})); }
// 3. STUTTER: a fresh grain on every step (0.25 s): the grain taken at 0.25 s repeats through the silence until the next step takes silence
{ const { out } = run({stutter:true, step:0.25, grain:0.06}, 1.2, 220, { off:0.3 });
  const held=rms(out,sr*0.35,sr*0.48), after=rms(out,sr*0.8,sr*1.15), b=bestFreq(out,sr*0.3,sr*0.48);
  say('STUTTER: the grain taken at the step start (0.25 s) repeats at 220 Hz after the voice stops (0.35–0.48 s loud), and the steps after that, which took silence, are silent', held>0.1 && b.f===220 && after<0.01, JSON.stringify({held:+held.toFixed(3),f:b.f,after:+after.toExponential(2)})); }
// 4. GROWL: an audio-rate wobble spreads the tone into sidebands 31 Hz either side
{ const { out } = run({xface:5, depth:1}, 1.5, 220); const { out:o2 } = run({xface:1, depth:0}, 1.5, 220);
  const side = a => goertzel(a,sr*0.5,sr*1.4,251)+goertzel(a,sr*0.5,sr*1.4,189), sG=side(out), sP=side(o2), cG=goertzel(out,sr*0.5,sr*1.4,220), cP=goertzel(o2,sr*0.5,sr*1.4,220);
  say('GROWL: sidebands at 220±31 Hz appear and the tone itself gives way', sG>sP*5 && cG<cP*0.9, JSON.stringify({sideGrowl:+sG.toExponential(2),sidePlain:+sP.toExponential(2),cGrowl:+cG.toExponential(2),cPlain:+cP.toExponential(2)})); }
// 5. PERC: shape 4 sounds the onset for a moment and is gone sooner than PLUCK
{ const { out } = run({env:true, shape:4, atk:0.002, rel:0.05}, 1, 220); const { out:o2 } = run({env:true, shape:0, atk:0.002, rel:0.05}, 1, 220);
  const p0=rms(out,sr*0.01,sr*0.04), p1=rms(out,sr*0.4,sr*0.9), k1=rms(o2,sr*0.4,sr*0.9), k0=rms(o2,sr*0.05,sr*0.1), pp=rms(out,sr*0.05,sr*0.1);
  say('PERC: the onset sounds, the rest is silent, and it is shorter than PLUCK', p0>0.1 && p1<0.01 && k1<0.01 && pp<k0*0.8, JSON.stringify({onset:+p0.toFixed(3),tail:+p1.toExponential(2),pluckTail:+k1.toExponential(2),perc60ms:+pp.toFixed(3),pluck60ms:+k0.toFixed(3)})); }
process.exit(ok?0:1);
