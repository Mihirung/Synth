# 2. How the original worked

The Reactable was three loosely coupled systems joined by a network protocol. This
separation is the single most important thing to copy, because it is what lets our rebuild
be virtual-first and physical-later without rework.

```
┌────────────────────────────────────────────────────────────────────┐
│  HARDWARE: round translucent table, IR illumination, camera and    │
│  projector underneath, passive pucks/cubes with fiducial markers   │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ camera frames
┌──────────────────────────────▼─────────────────────────────────────┐
│  reacTIVision (open source, GPL): fiducial + finger tracking       │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ TUIO messages (OSC over UDP, port 3333)
┌──────────────────────────────▼─────────────────────────────────────┐
│  Instrument application (proprietary, lost):                       │
│   - connection manager ("dynamic patching")                        │
│   - OpenGL visual feedback drawn around the physical objects       │
│   - synthesis engine (Pure Data in the research instrument)        │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ audio out + projected UI back onto table
```

## 2.1 Hardware

- Round table roughly 90 cm across; the top is translucent acrylic with a diffusing layer.
- Underneath: infrared LED illuminators (invisible to the audience and to the projected
  image), an IR-sensitive camera fitted with an IR band-pass filter so it sees only the
  markers and fingers, not the projection ("diffused illumination" configuration), and a
  projector bouncing off a mirror to back-project the interface onto the surface.
- The objects are completely **passive**: plexiglass pucks and cubes with printed markers,
  no electronics. Cubes carry a different fiducial on each face, so turning a cube to
  another face swaps which module (or which preset of a module) is active. This is why
  cubes were used for the sound generators: six sounds per physical object.

## 2.2 reacTIVision and TUIO (still available, still maintained)

[reacTIVision](https://reactivision.sourceforge.net/) is the computer-vision half, written
by Kaltenbrunner and Bencina, released under GPLv2+ and
[still maintained on GitHub](https://github.com/mkalten/reacTIVision). It performs adaptive
thresholding on each camera frame, finds fiducials by their region adjacency topology, and
also tracks bare fingertips. The default **amoeba** set has 216 distinct markers; a newer
**yamaarashi** set supports over a million IDs in a smaller footprint. Windows, macOS and
Linux are supported with ordinary UVC/V4L2 webcams.

Its output is [**TUIO**](https://tuio.org/), an Open Sound Control based UDP protocol
(default port 3333) that reports, for every tracked object: a session ID, a **class ID**
(which fiducial, therefore which module type), x/y position, rotation angle, and motion
velocities; and for every finger: session ID, x/y and velocity. TUIO 1.1 client libraries
exist for C++, Java, C#, Processing, Python and
[JavaScript](https://github.com/InteractiveScapeGmbH/tuio_client_js), and Kaltenbrunner
publishes a [TUIO 1.1 Simulator](https://github.com/mkalten/TUIO11_Simulator) that fakes a
table with virtual pucks for development without hardware.

The key architectural fact: **the synthesiser never talks to the camera.** It only consumes
TUIO. Anything that emits the same messages (a simulator, a mouse, a different sensing
technology) drives the instrument identically.

## 2.3 The instrument application (the part we must rebuild)

### Dynamic patching

The Reactable is a **modular synthesiser without patch cables**. The connection manager
continuously rebuilds the audio graph from object positions using proximity and type
compatibility (specified in the
[Dynamic Patches paper, NIME 2004](https://www.nime.org/proceedings/2004/nime2004_019.pdf)):

- The **centre of the table is the master output** (the pulsing white dot; its pulse shows
  the global tempo).
- A **generator** (oscillator, sample player) connects towards the centre, either directly
  or through the nearest compatible **audio filter** (filter, delay, modulator), forming
  chains. Moving an object between two others splices it into the chain; moving it away
  breaks the link and the graph reflows automatically.
- **Controllers** (LFO, sequencer) attach to the nearest compatible object and send it
  control data rather than audio.
- Connections are drawn as glowing lines that render **the actual signal flowing through
  them**: audio links show the live waveform, control links show the control shape. This is
  not decoration; it is how players read the patch at a glance.
- A finger swiped across a connection line **cuts (mutes) it**; the classic research demos
  also allowed drawing a waveform near a wave-table object with a finger, which the object
  "absorbed" and played.

### The object set

The research papers group objects into seven functional families: **generators, audio
filters, controllers, control filters, mixers, clock synchronisers and containers**. The
commercial Reactable Live! object set (each with a manual page, see doc 01) included:

| Object | Behaviour |
|---|---|
| Oscillator | Virtual-analog voice; rotation sets pitch; waveform selectable; the melodic input shows a small keyboard/note picker |
| Sampler / Loop player | Plays loops and one-shots, synced to global tempo; cube faces select sounds |
| Filter | Low/high/band-pass on the incoming chain; rotation sets cutoff; finger arc sets resonance |
| Delay and other effects | Tempo-synced effects inserted into a chain |
| Modulator | FM/AM/ring modulation between signals |
| LFO | Sub-20 Hz control signal to its nearest object; four shapes; rotation sets rate |
| Sequencer | 16-step loop sequencer sending note events to samplers/oscillators; steps and notes edited by finger; this is the "little piano" UI |
| Tonalizer | Constrains incoming notes to a musical scale |
| Volume / Accents | Per-chain dynamics control |
| Tempo (global) | Rotation sets BPM for the whole table, reflected by the centre pulse |

Around every object the application drew a local UI: a circular arc-fader for the
secondary parameter, small icons for discrete options (waveform shape, filter mode), and a
progress ring where relevant. All of it tracked the physical object in real time as it
moved and rotated.

### Sound engine

The research instrument's synthesis ran in **Pure Data** (Günter Geiger's domain), with the
papers noting the control layer could equally drive SuperCollider or Max/MSP; the commercial
products later moved to an in-house engine. The graphics were a custom OpenGL application.
For the rebuild this means there is no canonical DSP code to recover; we reimplement
standard virtual-analog building blocks (oscillators, filters, delays, sample playback),
which are well understood, and copy the *behaviour* documented in the manuals.

## 2.4 Prior art worth reading before writing code

- [GNU Psychosynth](https://github.com/arximboldi/psychosynth): a GPL C++ modular synth
  explicitly inspired by the Reactable, with a 3D simulated table. Dormant, but its object
  and connection model is instructive.
- [TobiBu/Reactable](https://github.com/TobiBu/Reactable): a small Python recreation using
  pyo for DSP and pytuio for input; useful as a minimal proof that the reacTIVision-to-synth
  pipeline still works.
- [Spyractable (2014 paper)](https://link.springer.com/chapter/10.1007/978-3-319-07230-2_57):
  an academic Reactable derivative, documents another take on the object semantics.
- The [TUIO 1.1 Simulator](https://github.com/mkalten/TUIO11_Simulator) and
  [tuio_client_js](https://github.com/InteractiveScapeGmbH/tuio_client_js) for the input path.

None of these is a finished, usable Reactable; the instrument application genuinely needs
rebuilding.
