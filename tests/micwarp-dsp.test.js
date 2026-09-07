// Lumatable: the live pitch shifter behind a warp puck on a mic block, numerically: unity passes through, +12 doubles the pitch, −12 halves it, reverse keeps the level.   node tests/micwarp-dsp.test.js
const fs=require('fs');
const path=require('path'); const html=fs.readFileSync(path.join(__dirname,'..','prototype','index.html'),'utf8');
const core=html.slice(html.indexOf('const DSP_CORE = String.raw`')+'const DSP_CORE = String.raw`'.length, html.indexOf('`;\nconst WORKLET_SRC'));
const LW=new Function(core+'\nreturn LiveWarp;')();
const sr=48000;
const rms=(a,s,e)=>{ s=Math.floor(s); e=Math.floor(e); let x=0; for(let i=s;i<e;i++) x+=a[i]*a[i]; return Math.sqrt(x/(e-s)); };
const peak=a=>{ let p=0; for(const v of a) p=Math.max(p,Math.abs(v)); return p; };
function goertzel(a,s,e,f){ s=Math.floor(s); e=Math.floor(e); const w=2*Math.PI*f/sr, c=2*Math.cos(w); let s0=0,s1=0,s2=0; for(let i=s;i<e;i++){ s0=a[i]+c*s1-s2; s2=s1; s1=s0; } return Math.sqrt(s1*s1+s2*s2-c*s1*s2)/(e-s); }
// a delay-line shifter smears each tone into sidebands at the grain rate, so pitch is judged by the energy in a band (±8%) around each candidate
function band(a,s,e,f){ let v=0; for(let k=-8;k<=8;k++) v+=goertzel(a,s,e,f*(1+k*0.01)); return v; }
const CANDS=[110,146.8,165,220,293.7,330,440,880];
function bestFreq(a,s,e){ let bf=0,bv=0; const acc={}; for(const f of CANDS){ const v=band(a,s,e,f); acc[f]=+v.toExponential(2); if(v>bv){ bv=v; bf=f; } } return {f:bf,v:bv,acc}; }
function run(cfg, secs, hz){
  const w=new LW(sr); w.handle({type:'cfg',cfg}); const N=Math.floor(sr*secs), inp=new Float32Array(N), out=new Float32Array(N);
  for(let i=0;i<N;i++) inp[i]=0.5*Math.sin(2*Math.PI*hz*i/sr);
  for(let i=0;i<N;i+=128) w.process(inp.subarray(i,i+128), out.subarray(i,i+128), Math.min(128,N-i));
  return { inp, out };
}
let ok=true; const say=(n,c,i)=>{ console.log((c?'PASS ':'FAIL ')+n+(i?' · '+i:'')); ok=ok&&c; };

// 1. unity: the signal passes through at level (a millisecond late)
{ const { inp, out } = run({ratio:1, grain:0.08, rev:false}, 1, 220);
  const ri=rms(inp,sr*0.3,sr*0.9), ro=rms(out,sr*0.3,sr*0.9), b=bestFreq(out,sr*0.3,sr*0.9);
  say('unity ratio: level within 5%, pitch unchanged', Math.abs(ro/ri-1)<0.05 && b.f===220, JSON.stringify({ri:+ri.toFixed(3),ro:+ro.toFixed(3),f:b.f})); }
// 2. an octave up: 220 becomes 440
{ const { out } = run({ratio:2, grain:0.08, rev:false}, 1.5, 220);
  const b=bestFreq(out,sr*0.5,sr*1.4), at220=band(out,sr*0.5,sr*1.4,220), at440=band(out,sr*0.5,sr*1.4,440), lv=rms(out,sr*0.5,sr*1.4);
  say('+12 st: the strongest tone is 440 Hz, well above the 220 Hz residue, level kept', b.f===440 && at440>at220*3 && lv>0.2 && lv<0.5 && peak(out)<0.9, JSON.stringify({f:b.f,at220:+at220.toExponential(2),at440:+at440.toExponential(2),lv:+lv.toFixed(3)})); }
// 3. an octave down: 220 becomes 110
{ const { out } = run({ratio:0.5, grain:0.08, rev:false}, 1.5, 220);
  const b=bestFreq(out,sr*0.5,sr*1.4), at220=band(out,sr*0.5,sr*1.4,220), at110=band(out,sr*0.5,sr*1.4,110);
  say('−12 st: the strongest tone is 110 Hz', b.f===110 && at110>at220*3, JSON.stringify({f:b.f,at220:+at220.toExponential(2),at110:+at110.toExponential(2)})); }
// 4. a fifth up with a long grain, and a fifth down with a short one
{ const a = run({ratio:Math.pow(2,7/12), grain:0.16, rev:false}, 1.5, 220), b = run({ratio:Math.pow(2,-7/12), grain:0.05, rev:false}, 1.5, 220);
  const ba=bestFreq(a.out,sr*0.5,sr*1.4), bb=bestFreq(b.out,sr*0.5,sr*1.4);
  say('+7 st → 330 Hz with a long grain, −7 st → 147 Hz with a short one', ba.f===330 && bb.f===146.8, JSON.stringify({fa:ba.f,fb:bb.f,accB:bb.acc})); }
// 5. reverse: every grain read backwards keeps a sine at its pitch and level, with no clicks above unity
{ const { out } = run({ratio:1, grain:0.08, rev:true}, 1.5, 220);
  const b=bestFreq(out,sr*0.5,sr*1.4), lv=rms(out,sr*0.5,sr*1.4);
  say('reverse: pitch and level held, peak sane', b.f===220 && lv>0.25 && lv<0.5 && peak(out)<0.9, JSON.stringify({f:b.f,lv:+lv.toFixed(3),pk:+peak(out).toFixed(2)})); }
// 6. a change of ratio mid-stream takes effect without a burst
{ const w=new LW(sr); w.handle({type:'cfg',cfg:{ratio:1,grain:0.08,rev:false}}); const N=sr*2, inp=new Float32Array(N), out=new Float32Array(N);
  for(let i=0;i<N;i++) inp[i]=0.5*Math.sin(2*Math.PI*220*i/sr);
  for(let i=0;i<N;i+=128){ if(i===sr) w.handle({type:'cfg',cfg:{ratio:1.5}}); w.process(inp.subarray(i,i+128), out.subarray(i,i+128), 128); }
  const f0=bestFreq(out,sr*0.4,sr*0.9).f, f1=bestFreq(out,sr*1.4,sr*1.9).f;
  say('ratio changes live: 220 then 330, no peak above 0.9', f0===220 && f1===330 && peak(out)<0.9, JSON.stringify({f0,f1,pk:+peak(out).toFixed(2)})); }
// 7. speed: a second of audio in well under a second
{ const w=new LW(sr); w.handle({type:'cfg',cfg:{ratio:1.26,grain:0.08,rev:false}}); const inp=new Float32Array(128), out=new Float32Array(128);
  const t0=process.hrtime.bigint(); for(let i=0;i<sr*5/128;i++) w.process(inp,out,128); const ms=Number(process.hrtime.bigint()-t0)/1e6;
  say('five seconds of audio in under a second', ms<1000, ms.toFixed(0)+' ms'); }
process.exit(ok?0:1);
