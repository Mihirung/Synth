# 5. Feature parity with the original Reactable

This tracks Lumatable against the original Reactable (research instrument plus the commercial
Reactable Live!), and against what a team would add if they built it new in 2026. It is the
answer to "what's still missing", kept honest.

Legend: **done** = built and tested · **partial** = present but not to the original's full
depth · **hardware** = needs the physical table (Phase B) · **out of scope** = deliberately
excluded, with reason.

## Original Reactable objects

| Object | Status | Notes |
|---|---|---|
| Oscillator | **done** | Dual detuned voices, 4 waveforms + a finger-drawn wave, scale-quantised, little piano, proximity FM |
| Sampler / loop player | **done** | Six synthesised loops + your own imports; bar-synced; rotate to change loop |
| Sequencer | **done** | 16 radial pitch pads; drives oscillators, and slices samplers/recorders |
| Filter | **done** | LP/HP/BP, cutoff by rotation, resonance by arc |
| Delay | **done** | Tempo-synced divisions, feedback by arc |
| Modulator | **done** | Ring/AM; plus oscillator-to-oscillator FM by proximity |
| LFO | **done** | Free-run Hz and tempo-synced divisions; modulates osc/filter/delay |
| Distortion / waveshaper | **done** | "Drive" object |
| Reverb | **done** | Convolution with rotation-set decay |
| Input (live audio) | **done** | "Mic" object via getUserMedia |
| Loop recorder | **done** | Captures the table's own output for 1/2/4/8 bars, loops it |
| Tempo (global) | **done** | Tangible "tempo" puck (rotate to set BPM), plus a header chip |
| Tonalizer (scale) | **done** | Global key + scale (penta/major/minor/blues); a global rather than a puck |
| Volume / accents | **partial** | Per-object arc acts as level; no dedicated master-volume object (master gain + limiter are automatic) |
| Containers / groups | **out of scope** | A power-user grouping feature; low value for the target audience |

## Original interactions

| Interaction | Status | Notes |
|---|---|---|
| Dynamic proximity patching | **done** | With hysteresis so links don't flicker |
| Rotate for primary parameter | **done** | Every object |
| Arc fader for secondary | **done** | Every object except the tempo puck |
| Live waveform on connections | **done** | Real per-connection AnalyserNode |
| Cut a connection | **done** | Swipe across the line (robust crossing test) |
| Finger-drawn waveform absorbed by oscillator | **done** | Draw a shape near an osc; becomes its tone |
| Cube-face flipping for presets/sounds | **partial** | Double-tap cycles modes on screen; true per-face banks arrive with physical cubes (**hardware**) |
| Multi-touch, many hands | **partial** | Multi-touch works on one screen; several people on one table is **hardware** |

## Modern additions (what they'd build today)

| Feature | Status | Notes |
|---|---|---|
| Shareable patch links | **done** | Whole scene encoded in the URL |
| Scene persistence | **done** | localStorage between visits |
| Audio file import | **done** | Any file becomes a bar-fitted loop |
| Record performance to a file | **done** | MediaRecorder → downloads capability (WebM/Opus) |
| Web MIDI clock + note out | **done** | Drives external gear/DAW when a MIDI output exists |
| Tempo-synced everything | **done** | Loops, delay, LFO, sequencer share one clock |
| Swing / groove | **done** | Off/lite/full, baked into loops and sequencer |

## Still open (would improve it further)

- **WAV export** instead of WebM: needs an offline render or a WAV encoder; WebM/Opus is what
  MediaRecorder gives for free and every browser and DAW imports it.
- **MIDI in** (external clock/notes controlling the table), and MIDI CC out for parameters.
- **Polyphonic oscillators**: each osc is monophonic; chords come from multiple oscillators or
  the chord loop. The original was similar.
- **Master-volume / VU object** as a dedicated tangible.
- **Undo**, and named multi-slot scene saving (only one autosaved scene today).
- **A richer reverb** (algorithmic, pre-delay) and more effect types (chorus, bitcrusher).

## Genuinely impossible here (environment limits, not design)

- **Real fiducial tracking in the published artifact.** The reacTIVision path (docs/02, 04)
  needs a camera, a local process and UDP, none of which a sandboxed web page can reach. The
  code path exists (`?tuio=`) and runs against the repo copy with the bridge; it cannot run
  inside claude.ai. This is Phase B by design.
- **Sub-5 ms audio latency.** Web Audio adds output latency a native (JUCE/libpd) build would
  not. Fine for this instrument; a hardware installation would use the native path.
- **Guaranteed microphone / MIDI in the artifact sandbox.** Both depend on the viewer's
  browser granting permission to the framed page; they work in the standalone repo build and
  in permissive browsers, and degrade gracefully (the chip simply doesn't appear) elsewhere.

The short version: every sound object and interaction the original Reactable had now exists
here, plus the recorder, mic, and tangible tempo it had that we previously lacked, plus modern
sharing, import, recording and MIDI. What remains is either polish, or belongs to the physical
table.
