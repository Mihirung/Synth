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
| Oscillator | **done** | Dual detuned voices, 4 waveforms + a finger-drawn wave, scale-quantised, little piano, proximity FM, **polyphonic** (chords from sequencer / MIDI / keys) |
| Sampler / loop player | **done** | Six synthesised loops + your own imports; bar-synced; rotate to change loop |
| Sequencer | **done** | 16 radial pitch pads; drives oscillators, and slices samplers/recorders |
| Filter | **done** | LP/HP/BP, cutoff by rotation, resonance by arc |
| Delay | **done** | Tempo-synced divisions, feedback by arc |
| Modulator | **done** | Ring/AM; plus oscillator-to-oscillator FM by proximity |
| LFO | **done** | Free-run Hz and tempo-synced divisions; modulates osc/filter/delay |
| Distortion / waveshaper | **done** | "Drive" object |
| Reverb | **done** | Convolution with rotation-set decay |
| Chorus | **done** | LFO-modulated delay (a modern addition beyond the original set) |
| Bitcrusher | **done** | "Crush" object, 2-12 bit (a modern addition) |
| Input (live audio) | **done** | "Mic" object via getUserMedia |
| Loop recorder | **done** | Captures the table's own output for 1/2/4/8 bars, loops it |
| Tempo (global) | **done** | Tangible "tempo" puck (rotate to set BPM), plus a header chip |
| Tonalizer (scale) | **done** | Global key + scale chips, and a tangible *key* puck (turn = key, slide = scale, faces = octave); a *tuning* puck adds eleven temperaments |
| Volume / accents | **done** | Per-object arc as level, a *master* puck (volume + glue), and sequencer accents (three-state pads with an *express* puck) |
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
| Cube-face flipping for presets/sounds | **done** | A single tap flips to the next face on screen; every object's modes are faces; sequencers keep a four-pattern bank, scenes four snapshots; the printed cubes carry four faces |
| Multi-touch, many hands | **partial** | Multi-touch works on one screen; several people around one table is the physical build (**hardware**), which is how the original did it too |

## Modern additions (what they'd build today)

| Feature | Status | Notes |
|---|---|---|
| Shareable patch links | **done** | Whole scene encoded in the URL |
| Scene persistence | **done** | localStorage between visits |
| Audio file import | **done** | Any file becomes a bar-fitted loop |
| Record performance to a file | **done** | MediaRecorder → downloads capability (WebM/Opus) |
| Web MIDI clock + note out | **done** | Drives external gear/DAW when a MIDI output exists |
| Web MIDI note in | **done** | A MIDI keyboard plays the oscillators polyphonically (voices), ducking the drone while held |
| Computer-keyboard playing | **done** | The A-L home row plays the current scale into every free oscillator |
| Polyphony | **done** | Per-oscillator voice engine: sequencer, MIDI and keys all play chords / overlapping notes |
| Scales | **done** | Pentatonic, major, minor, dorian, mixolydian, harmonic minor, blues, chromatic |
| Master output level (VU) | **done** | A level-driven ring around the centre output |
| Undo | **done** | 40-deep snapshot stack; chip + Ctrl/Cmd+Z |
| Tempo-synced everything | **done** | Loops, delay, LFO, sequencer share one clock |
| Swing / groove | **done** | Off/lite/full, baked into loops and sequencer |
| Analogue sound engines | **done** | Four selectable per-sample models (Moog ladder, ZDF ladder, SEM SVF, MS-20) with PolyBLEP drifting oscillators and a valve output stage; see docs/06 |
| GPU-lit rendering | **done** | WebGL bloom, glass caustics, beat/touch ripples, aurora, vignette, grain; per-object audio-reactive light and signal motes; adaptive resolution; CPU glows gone from the hot path |
| Microtonal tuning | **done** | *Tuning* puck: just, Pythagorean, meantone, Werckmeister III, Kirnberger III, 19/31-EDO, neutral, slendro, pelog; reference A slider; loops retune on face 2 |
| Envelopes | **done** | *Envelope* puck: ADSR per oscillator in both engines, or a velocity-driven filter envelope |
| Velocity / pressure / aftertouch | **done** | *Express* puck: accents, MIDI velocity and aftertouch, pitch wheel, pen pressure, pinch pressure, cube lift and tilt; destinations vibrato/bright/tremolo/bend |
| Sequencer depth | **done** | *Steps* (length, rate, direction), *euclid* (Bjorklund), *chance* (probability, ratchets, fills, skips, humanise), *chain* (pattern arrangement) |
| Scenes and morphing | **done** | *Scene* puck: four snapshots as faces, morph by turning, crossfade by the slider, lift-and-replace to store |
| Gesture recording | **done** | *Motion* puck loops any movement of any object on the grid |
| Time-stretch / pitch-shift | **done** | *Warp* puck: granular pitch without tempo change, half/double speed, reverse |
| Effect sends | **done** | *Send* puck: proximity-scaled sends into any effect, pre or post |
| Stereo | **done** | *Space* puck: position, orbit or radial width |
| Stems export | **done** | *Stems* puck: a multichannel WAV, a channel per object plus master (hosted build) |
| Persistent imports | **done** | Imports live in IndexedDB and return after a reload, up to six, all warpable |
| Printed kit | **done** | STL/OBJ cube and pucks with marker pockets, 8-bit marker sheets, printable cards |

## Still open (genuine diminishing returns, not blockers)

- **WAV export** instead of WebM: `wav` is not in the artifact download allowlist, and
  WebM/Opus is what MediaRecorder gives for free and every DAW imports; a native/repo build
  could add a WAV encoder. Low value.
- **MIDI clock in** (slaving the table's transport to external clock) and **MIDI CC out**
  for parameters: useful in a studio rig, fiddly to get glitch-free, niche for this audience.
- **Polyphonic chord *steps* in the sequencer**: the sequencer is polyphonic-capable
  (voices overlap and stack), but each step still holds one note; stacking two sequencers
  on one oscillator gives chords today.
- **Tilt direction**: a tilted cube's disc says how far, not which way, so tilt bends up
  only (docs/07).

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
- **Networked multiplayer without losing public sharing.** Real-time collaboration (two people
  on two devices playing one table) is buildable with the artifact `room` capability, but a
  page that declares `room` (or `db`) becomes organisation-internal and can no longer be
  shared by public link. That trade breaks the core use case here (hand the link to a child on
  any device), so it is deliberately not taken. The original Reactable's multiplayer was
  physical, many hands on one surface, which the Phase B table delivers; a networked variant
  is a one-flag change for anyone who wants org-internal collaboration instead of open sharing.

The short version: every sound object and interaction the original Reactable had now exists
here, plus the recorder, mic, and tangible tempo it had that we previously lacked, plus modern
sharing, import, recording and MIDI, plus an advanced drawer of fifteen pucks for the serious
player. What remains is either polish, or belongs to the physical table, whose parts are now in
`hardware/`.
