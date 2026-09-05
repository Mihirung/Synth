# Synth: rebuilding a Reactable-style tangible modular synthesiser

This repository contains research and a build plan for recreating the software behind the
**Reactable**, the tabletop tangible modular synthesiser developed at the Music Technology
Group, Universitat Pompeu Fabra (Barcelona), and famously played on Björk's Volta tour
(2007 to 2008). The company that commercialised it, Reactable Systems SL, ceased trading and
was dissolved in 2022, but the underlying tracking technology is open source and the
instrument's behaviour is thoroughly documented in academic papers, the archived product
manuals, and hundreds of videos.

The goal here is a **clean-room reimplementation**, built virtual-first:

1. **Phase A (virtual)**: a purely software instrument. Virtual cubes are dragged, rotated and
   flipped on a circular on-screen stage using mouse or touchscreen, and a virtual analog
   synthesis engine responds exactly as the original table did.
2. **Phase B (physical, later)**: the same software driven by a real camera-tracked table.
   Physical cubes carrying printed fiducial markers sit on a back-projected multi-touch
   surface, tracked by the open-source reacTIVision framework.

The architecture is designed so Phase B needs **no changes to the instrument itself**: all
surface input (virtual or physical) flows through one abstraction modelled on the TUIO
protocol, which is exactly how the original Reactable separated its vision system from its
synthesiser.

## Documents

| Document | Contents |
|---|---|
| [docs/01-what-it-was.md](docs/01-what-it-was.md) | Identification, history, Björk's use, company timeline, where the documentation survives |
| [docs/02-how-it-worked.md](docs/02-how-it-worked.md) | The original architecture: hardware, reacTIVision, TUIO, dynamic patching, the object set and interaction model |
| [docs/03-rebuild-plan.md](docs/03-rebuild-plan.md) | Proposed architecture, technology choices, phased plan with effort estimates, hardware path, legal notes |

## Status

The virtual instrument is built and playable: [`prototype/index.html`](prototype/index.html),
a self-contained page with no dependencies or build step (open it in any browser; multi-touch
works via Pointer Events). Beyond the Phase 0 core (circular stage, tempo-pulsing centre
output, proximity-based dynamic patching with hysteresis, rotation and arc-fader control,
live waveforms drawn on connection lines, tap-to-mute), it now covers the full Phase 1 and
most of Phase 2 of the plan:

- **Objects**: oscillator, loop sampler, 16-step sequencer with radial pitch pads, filter,
  tempo-synced delay, ring modulator, and LFO.
- **Global musicality** (the Tonalizer made global): a key and scale system (pentatonic,
  major, minor, blues) quantises every pitch, and a global transport locks loops, sequencer
  and delay times to the beat, so nothing can sound wrong — playable by an eight-year-old,
  with real control (BPM, key, scale, semitone-accurate readouts) for a musician.
- **Loop material is synthesised at startup** (kick, beat, hats, bass, chord, arp — the
  tonal loops regenerate when key or scale changes), so the file stays dependency-free.
- **Scenes persist** in the browser between visits, with demo and clear controls, and any
  patch can be shared as a **jam link** (the whole scene encoded in the URL — open it on
  any device and the patch loads).
- **Swing** (off/lite/full, baked into the generated loops and the sequencer), a
  dual-detuned oscillator voice for a warmer virtual-analog tone, and **audio import**:
  load any audio file as a bar-fitted loop on a sampler cube.
- **Full original-Reactable object set and gestures**: distortion and reverb effects,
  oscillator-to-oscillator FM by proximity, a live-input mic object, a loop recorder that
  captures the table's own output and loops it, a tangible tempo puck, a sequencer that
  also slices samplers, tempo-synced LFOs, swipe-to-cut connections, and finger-drawn
  oscillator waveforms.
- **Modern I/O**: record the performance to a file, and Web MIDI clock + note output to
  drive external gear or a DAW. See [docs/05-feature-parity.md](docs/05-feature-parity.md)
  for the full parity ledger against the original.
- **GPU renderer**: the crisp 2D scene is composited through a WebGL post pipeline (two-scale
  bloom, glass caustics, physical beat-and-touch ripples via UV displacement, a faint aurora,
  vignette and grain) with every CPU `shadowBlur` removed from the hot path. Every block and
  line is lit by its own live signal level, motes of light travel the connections in time,
  and adaptive resolution trades pixels for frames on slow devices. A Canvas-2D fallback keeps
  it running without WebGL; all motion respects `prefers-reduced-motion`.
- **Polyphonic voice engine**: oscillators play chords and overlapping notes, driven by the
  sequencer, a MIDI keyboard, the on-screen piano, or the A-L computer keys. Eight scales,
  chorus and bitcrusher effects, a master VU ring, and undo (Ctrl/Cmd+Z).
- **Physical-table ready**: open the page with `?tuio=ws://localhost:8765` and run
  [`prototype/tuio-bridge.js`](prototype/tuio-bridge.js) to drive it from reacTIVision's
  TUIO stream instead of the mouse (fiducial class IDs map to object types in blocks of
  eight). Untested against real hardware, by definition, but the seam is in place.

Remaining from the plan: sample import for the sampler, a melodic note picker as an
alternative to the radial pads, and the hardware build itself (docs/03, Phase B).
