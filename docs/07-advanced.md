# 7. The advanced pucks

The main tray is a child's tray: fourteen blocks, one job each, nothing that can go
wrong. Everything a serious player asked for lives one drawer down, behind the **more**
button, as fifteen further objects. They are hexagonal on screen and hexagonal in the
printed kit, so they read as a different family at a glance, and the eight-year-old
never has to open the drawer at all.

They follow the table's one rule: an object does what it does by **being there**
(presence), by **where it sits** (position, and so proximity), by **turning** (its main
parameter), by **the arc** (its second parameter) and by **which face is up** (its
mode). A single tap on screen is the same as flipping a cube to its next face. Nothing
needs a menu.

## The set

| Puck | Sits by | Turn | Slide | Faces |
|---|---|---|---|---|
| **key** | anywhere | key C…B | scale | octave 0 / +1 / −1 / +2 |
| **tuning** | anywhere | tuning system | reference A, 415–466 Hz | oscillators · oscillators + loops |
| **envelope** | an oscillator or a filter | attack 1 ms – 2 s | release 20 ms – 4 s | PLUCK · KEYS · PAD · SWELL |
| **express** | an oscillator, a filter, or anywhere | velocity depth | velocity curve soft–hard | where aftertouch goes: VIBRATO · BRIGHT · TREMOLO · BEND |
| **steps** | a sequencer | pattern length 1–16 | rate 1/32 · 1/16 · 1/8 · 1/4 | FORWARD · REVERSE · PING-PONG · RANDOM |
| **euclid** | a sequencer | hits 1–16 | rotate the pattern | pitches: ROOT · ALTERNATE · RISING · RANDOM |
| **chance** | a sequencer | probability 100 → 5 % | humanise | DICE · RATCHET · FILL · SKIP |
| **chain** | a sequencer | every 1 · 2 · 4 · 8 bars | how many patterns, 2–4 | LOOP · PING-PONG · RANDOM · SONG |
| **scene** | anywhere | morph live → snapshot | crossfade 0–4 bars | snapshot A · B · C · D |
| **motion** | any object | loop 1 · 2 · 4 · 8 bars | smoothing | what it loops: TURN · SLIDE · MOVE · ALL |
| **warp** | a loop or recorder | pitch −12 … +12 semitones | grain 20–200 ms | PITCH · HALF · DOUBLE · REVERSE |
| **send** | an effect | send level | reach | POST · PRE |
| **space** | anywhere | stereo width | orbit speed | POSITION · ORBIT · RADIAL |
| **master** | anywhere | volume | glue | CLEAN · GLUE · PUMP · LIMIT |
| **stems** | anywhere | 1 · 2 · 4 · 8 · 16 · 32 bars | — | (place, tap or replace to arm) |

"Sits by" means the puck binds to the nearest suitable object within the control reach,
exactly as the LFO and sequencer already do; a dashed purple line shows the binding.
The "anywhere" pucks are global and need no line.

### Tuning

Every pitch the table plays passes through one function, so a tuning puck retunes the
whole instrument at once: oscillators, chords, the sequencer, MIDI and the computer
keys. Eleven systems, each as cents above the key note for the twelve chromatic
degrees: 12-TET, 5-limit just intonation, Pythagorean, quarter-comma meantone,
Werckmeister III, Kirnberger III, 19-EDO and 31-EDO (each 12-tone degree mapped to its
nearest step), a 24-EDO *neutral* mapping (neutral thirds, sixths and sevenths, the
Rast flavour), and slendro and pelog approximations (each degree snapped to the nearest
gamelan pitch). The slider moves the reference A a semitone either way, so baroque
pitch (A = 415) is a slide. The second face retunes the generated loops as well
(they are re-synthesised in the background a quarter of a second after you stop
turning).

### Envelope

By an oscillator it is an ADSR for that oscillator's notes, in both engines: the
Web Audio voices ramp and settle per note, and the analogue models take attack, decay,
sustain and release per voice inside the DSP. The faces are shapes: PLUCK (no sustain),
KEYS, PAD, SWELL (a four-times-longer attack). By a **filter** it becomes a filter
envelope: every note the table plays kicks the cutoff up (by velocity) and lets it
fall back, which is the sound of every classic mono synth and was missing here.

### Velocity and expression

Velocity comes from four places, all scaled by the express puck (how much velocity
matters, and a soft-to-hard curve):

- **Sequencer accents.** With an express puck on the table, a pad has three states:
  off, on, accent (drawn brighter and thicker). Without one, pads are simply on or off,
  so the main tray stays simple.
- **MIDI note velocity**, as you would expect.
- **Pressure on the little piano.** Keys are now held rather than plucked: a note lasts
  as long as your finger, and a pressure-capable pen or screen reads as aftertouch.
- **Chance's humanise**, which also softens some hits.

Aftertouch and pressure go where the express puck's face says: vibrato, brightness
(the bound or downstream filter opens), tremolo, or a pitch bend. Sources are MIDI
channel and polyphonic aftertouch, the pitch wheel, pointer pressure while a piano key
is held, how tightly you pinch under the camera, and, for physical cubes, **lift and
tilt** (below).

### Steps, euclid, chance, chain

**Steps** gives a sequencer a length other than sixteen (odd lengths against the
sixteen-step loops make polymetres), a rate (1/32 to 1/4) and a direction, including a
seeded random walk that repeats exactly every loop so it is a pattern, not noise.
**Euclid** writes a Bjorklund rhythm into the sequencer it sits by, hits spread as evenly
as possible, in canonical form (E(5,8) = x.xx.xx.), rotated by the slider; its faces
choose the pitches. The sequencer's own pattern is restored when the puck leaves.
**Chance** makes each step a probability, and its faces change what an unlucky roll
does: drop the step (DICE), ratchet it into two or three hits, add a note on an empty
step (FILL, so the pattern grows), or jump ahead a few steps (SKIP). Humanise adds up
to ±15 ms of timing and a little level variation. **Chain** walks a sequencer through
its four patterns every N bars, as a loop, a ping-pong, at random, or in a fixed song
order, which gives the table an arrangement without a timeline.

Every sequencer now carries a bank of four patterns (A–D) selected by its face; edits
go into the current one and the bank persists with the scene.

### Scene

Four snapshots of the whole table, one per face. Placing the puck stores what is
playing into the face that is up; the small dot above it (on screen) or lifting the
puck and setting it straight back down (physical) stores again. Turning the puck
**morphs** from what is live toward the snapshot: every object's turn and arc glide,
discrete things (a loop choice, a waveform, a pattern) switch at the halfway point.
Turn it back to zero and the table returns to where it was before the morph started.
With the puck turned right up, flipping faces is a scene change, and the slider sets
how long the crossfade takes (instant to four bars). An object you are holding is left
alone by the morph.

### Motion

The table records how you move something and keeps doing it. Put the motion puck by a
filter, turn the filter for a bar, let go: the filter keeps turning, in time, forever.
Its faces choose what to loop (the turn, the slider, the position on the table, or all
three), its turn sets the loop length, and overdubbing is natural: any new movement
replaces that part of the loop. With physical cubes this is the moment the table plays
itself: the on-screen ring turns while the cube sits still.

### Warp

A loop or a recording is re-read as a cloud of Hann-windowed grains (20–200 ms), which
lets it be pitched up to an octave either way **without** changing tempo, played at
half or double speed at the same pitch, or backwards. The sequencer's slicing follows
the pitch shift too.

### Send, space, master

**Send** turns the effect it sits by into a return bus, and every generator on the
table feeds it by how close it sits to the puck: a proximity send, a mix decision made
by moving things. POST taps after each object's level; PRE before it. **Space** makes
the table the stereo field: left is left, or the sounds orbit, or width grows with
distance from the centre. **Master** is the volume and glue compression the parity
ledger listed as missing.

### Stems

While the stems puck records (its turn sets one to thirty-two bars; place it, tap it,
or lift and replace it to arm), every sounding object on the table is tapped
separately and written, with the master, into **one multichannel WAV** (16-bit PCM, a
channel per object, named in the puck's readout). Every DAW imports a multichannel WAV
and splits it. The WAV saves in the hosted build; the claude.ai artifact allowlist has
no `wav`, so there the puck says so.

Imported audio now persists too: each import lands in IndexedDB and comes back as a
`MINE` loop after a reload, up to six of them, all warpable.

## What is new about this combination

These are the ideas that only exist because a **camera**, a **screen** and a
**software synth** are in one loop, none of which the original Reactable could do:

1. **The cube is the expression controller.** Lifting a cube toward the camera makes
   its marker larger; the instrument reads the growth as pressure and routes it where
   the express puck says (vibrato, brightness, tremolo, bend). Tilting a cube squashes
   its disc into an ellipse; the instrument reads that as a pitch bend. No sensor in the
   object, no battery, no pairing. Aftertouch on a wooden block.
2. **Lift and replace.** Taking an object off the table and putting it straight back
   is the "again" gesture: a recorder records again, the stems puck arms again, the
   scene puck stores the current state. The screen remembers what the lifted object
   was doing for four seconds, so it comes back as it was.
3. **A mix by geometry.** Sends scale with distance to the send puck; stereo position
   is table position. The mixer is the floor plan.
4. **Gesture loops.** The motion puck makes any movement of any object a loop on the
   grid, so one hand can hold four automations.
5. **Morph by face.** Scene snapshots are faces of a cube; the morph amount is how far
   it is turned. A performance is a stack of cubes and a wrist.
6. **Tuning as an object.** Slide a puck onto the table and the whole instrument is in
   just intonation; take it off and it is back in 12-TET. Comparing temperaments becomes
   a physical A/B.

## The physical kit

`hardware/print/` holds `cube-60`, `puck-70-round` and `puck-70-hex` as STL and OBJ,
each with shallow circular pockets that a printed marker disc drops into; the
generator (`hardware/make_parts.py`) is pure Python and checks each mesh is watertight.
`hardware/markers-60mm.html` and `markers-52mm.html` are the marker sheets (every
object, four faces each, both trays); `hardware/cards.html` prints a card per object
with what turning, sliding and flipping does. See `hardware/README.md` for print
settings and assembly.

Markers now carry eight ID dots at 45° (256 ids) rather than six, so the twenty-nine
object types with four faces each fit with room to spare; the detector and the sheet
changed together, and the round-trip test renders each marker and reads it back.

## Honest limits

- **Tilt has no sign.** The disc's ellipse says how far a cube is tilted, not which
  way, so tilt is a bend upward only. Resolving the direction needs the cube's side
  face in view or a second camera.
- **Lift needs a steady camera.** The resting marker size is learned per object and
  drifts slowly with focus; a phone that is knocked mid-performance will read a lift
  until the size settles again (a few seconds).
- **Marker pixels.** A 52 mm disc at 720p on a 55" screen is about 52 px with 2.5 px
  ID dots. It works, with little margin; 1080p capture or the 60 mm sheet on pucks is
  safer.
- **Morphing and hands.** A morph skips any object you are holding; when you let go it
  eases to where the morph would have put it.
- **Stems in the artifact.** WAV is outside the artifact download allowlist; the hosted
  build (GitHub Pages) saves it.
