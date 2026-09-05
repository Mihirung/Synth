# 3. Rebuild plan

## 3.1 Design principle: one instrument, two surfaces

The original's decisive architectural move was putting a network protocol (TUIO) between
sensing and instrument. We copy that. Everything above the input layer is written once and
never knows whether a cube is real:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        SURFACE INPUT LAYER                           │
│                                                                      │
│  VirtualSurfaceProvider              TuioSurfaceProvider (Phase B)   │
│  mouse / touchscreen /               TUIO 1.1 over WebSocket bridge  │
│  trackpad manipulating               from reacTIVision + camera      │
│  on-screen cubes                     (also: TUIO11_Simulator)        │
│            └──────────────┬──────────────────┘                       │
│                    SurfaceEvent stream                               │
│   objectAdded / objectMoved(x, y, angle) / objectRemoved             │
│   cursorAdded / cursorMoved / cursorRemoved                          │
│   (object identity = class ID, same numbering as the fiducial set)  │
└───────────────────────────┬──────────────────────────────────────────┘
┌───────────────────────────▼──────────────────────────────────────────┐
│  INSTRUMENT MODEL (pure logic, no I/O, fully unit-testable)          │
│  object registry, dynamic patching rules, parameter state,           │
│  tempo/transport, scene save/load (JSON)                             │
└───────────┬──────────────────────────────────────┬───────────────────┘
┌───────────▼───────────────┐          ┌───────────▼───────────────────┐
│  AUDIO ENGINE (interface) │          │  RENDERER                     │
│  Web Audio + AudioWorklet │          │  circular stage, object       │
│  first; Faust/WASM or     │          │  auras, arc faders, animated  │
│  native libpd swappable   │          │  waveform connection lines    │
└───────────────────────────┘          └───────────────────────────────┘
```

Two rules make Phase B free:

1. **The virtual provider emits exactly what a TUIO client would**: class ID, normalised
   x/y in a circular stage, rotation angle. No virtual-only concepts leak upward (a mouse
   drag becomes an `objectMoved`, a two-finger twist or scroll-over-object becomes a
   rotation change, a right-click/long-press "flip cube" becomes remove + add with the
   class ID of the adjacent cube face).
2. **The class-ID map is data, not code**: one JSON file mapping fiducial IDs to module
   types and cube face groupings, shared by both providers, so the printed cubes we
   eventually make agree with the virtual ones by construction.

## 3.2 Technology choice

**Recommended: a TypeScript web application.**

- **Input**: Pointer Events give unified mouse, pen and multi-touch today; a future table
  just needs a Chromium kiosk or the TUIO bridge.
- **Audio**: Web Audio API. Native nodes (OscillatorNode, BiquadFilterNode, DelayNode,
  AudioBufferSourceNode, GainNode) cover the whole Reactable object set for a first
  version; an **AudioWorklet** provides the sample-accurate sequencer clock and any custom
  DSP (better filters, waveshaping) later. Latency of 10 to 30 ms is fine for this
  instrument (the original had camera latency of the same order).
- **Graphics**: Canvas 2D is sufficient at this object count; PixiJS (WebGL) if we want the
  glow-heavy original look cheaply. The signature visual, connection lines carrying the
  live waveform, comes from tapping an AnalyserNode per connection and drawing the sample
  buffer along the line each frame.
- **TUIO in the browser** (Phase B): browsers cannot open UDP sockets, so a 30-line Node
  relay forwards UDP port 3333 to a WebSocket, decoded with an OSC/TUIO JS library
  ([tuio_client_js](https://github.com/InteractiveScapeGmbH/tuio_client_js) or osc.js).
  This is a well-trodden path.
- **Why not native first?** C++ (JUCE or openFrameworks, plus libpd, as the original did)
  or Rust gives lower audio latency and direct UDP, at perhaps three times the build
  effort. The layering means the instrument model and patching rules could be ported later
  if the web audio path ever becomes the bottleneck; nothing in Phase A locks us in.
  Unity is the other credible shortcut (good visuals, existing TUIO clients), weaker on
  audio synthesis.

## 3.3 The instrument model (the actual hard part)

The vision layer is solved and the DSP is standard; the craft is in the **connection
manager and feel**, so it deserves the cleanest code:

- Represent the table as a set of typed objects with position, angle and per-type state.
- On every object move, rebuild the patch: generators chain through compatible audio
  filters towards the centre sink by proximity (nearest-compatible, with hysteresis so
  links do not flicker at boundaries); controllers bind to their nearest compatible
  target. Keep this a pure function from object set to graph so it can be unit-tested
  against scripted scenarios.
- Apply graph changes to the audio engine with short crossfades (about 20 ms) so
  re-patching never clicks.
- Rotation maps to each type's primary parameter; the arc fader around the object maps to
  its secondary parameter; discrete options are small tappable icons, exactly per the
  archived manuals.
- Global transport: a tempo object sets BPM; the centre dot pulses on the beat; sequencer,
  LFO (when synced) and loop players all derive timing from one sample-accurate clock in
  the AudioWorklet.

## 3.4 Phased plan and effort

Estimates assume one competent developer working with AI assistance; elapsed part-time
weeks in brackets.

- **Phase 0, proof of feel (1 to 2 days)**: circular stage, centre dot pulsing at 120 BPM,
  one draggable oscillator cube, proximity connection to centre with waveform-animated
  line, rotation controls pitch. This de-risks everything that matters.
- **Phase 1, core instrument (1 to 2 weeks)**: connection manager with chains and
  hysteresis; oscillator, filter, LFO, volume; arc faders and option icons; finger-swipe
  to cut connections; scene save/load.
- **Phase 2, full object set and polish (2 to 4 weeks)**: sampler/loop player with
  tempo-synced stretching, 16-step sequencer with the melodic note picker ("little
  piano"), tonalizer, delay and modulator effects, cube-face flipping UI, the glow
  aesthetic, preset banks. At the end of this phase the instrument is genuinely playable,
  which is roughly Reactable Mobile parity.
- **Phase 3, physical-input readiness (2 to 5 days)**: TUIO WebSocket bridge and provider;
  verify against Kaltenbrunner's TUIO11_Simulator, which behaves exactly like a real
  tracked table. After this phase the software is finished for Phase B; only hardware
  remains.
- **Phase B, the table (hardware project, later)**: classic diffused-illumination build,
  all documented by the multi-touch community:
  frosted acrylic surface on a plywood cabinet; 850 nm IR LED strips beneath; a camera
  with its IR-cut filter removed and an 850 nm band-pass added (the hacked
  [PS3 Eye](https://cdm.link/trick-out-your-ps3-eye-webcam-best-cam-for-vision-augmented-reality/)
  at 60 fps remains the classic budget choice, about £15 used; a modern global-shutter
  mono USB camera such as an OV9281 board is the better 2026 option at about £50); a
  short-throw projector bounced off a mirror; [reacTIVision](https://reactivision.sourceforge.net/)
  calibrated to the surface. Cubes are 3D-printed or laser-cut boxes with the amoeba
  fiducials (shipped with reacTIVision) printed matte on each face. Realistic budget £500
  to £1,500, dominated by the projector. Sizing note: keep the stage circular and
  resolution-independent from day one so it projects cleanly.

## 3.5 Legal and naming

- **reacTIVision is GPLv2+**, but it runs as a separate process communicating over UDP, so
  our application takes no licence obligation from it. That is precisely how the original
  proprietary Reactable used it.
- The TUIO protocol and fiducial marker images are published for exactly this kind of use.
- **"Reactable" is a trademark and the product's code, artwork and manuals are someone
  else's copyright** (rights presumably reverted to founders/UPF on dissolution). Build
  clean-room from the published papers and observed behaviour, redraw all art, and ship
  under a different name. Do not copy manual text or UI assets into the product.
- If this ever goes beyond personal use, a courtesy note to the MTG/founders would be
  wise; the community around this instrument is small and friendly.

## 3.6 Open questions for Phase 0

1. Rotation gesture for virtual cubes on a plain laptop (scroll wheel over object vs drag
   on a rotation ring): try the ring first, it matches the projected UI.
2. Canvas 2D vs PixiJS: decide after profiling Phase 0 with 10 objects and animated lines.
3. Whether to adopt the amoeba class-ID numbering immediately (recommended: yes, it costs
   nothing and locks in physical compatibility).
