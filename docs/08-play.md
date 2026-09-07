# 8. The play tray: instruments for hands and voice

The **play** button opens a third tray: seven instruments you play with your hands in the
air, with your voice, or, without any camera, with your fingers on the screen. It is the
tray for Frances. Every instrument follows the table's rules (place it, turn it, slide it,
flip it) and joins the patching like any generator: put a delay or a reverb between an air
harp and the centre and the harp goes through it.

Nothing here needs the camera table. On a laptop or tablet, placing a hand instrument turns
on the device's own camera, mirrors the picture onto the disc, and tracks hands with
MediaPipe on the device. With the overhead table camera on, hands are tracked in that view
instead, through the same calibration the cubes use, and a hand's apparent size is its
height above the table. Either way the picture never leaves the device.

## The instruments

| Instrument | By touch | By hands | Turn | Slide | Faces |
|---|---|---|---|---|---|
| **theremin** | drag a finger in its field: nearer the puck is higher | on the table, the puck is the antenna: a hand closer to it is higher, a second hand's height is the volume; at a webcam, pitch runs left to right | range, 1–4 octaves | level | FREE · IN KEY · GLIDE |
| **air drums** | tap the four pads around it; slide onto another pad for a roll | strike downward over a pad; the depth of the strike is the velocity | kit pitch | level | FREE · ON THE GRID · BIG KIT · TOMS |
| **harp** | sweep across the strings that fan out from it | sweep a fingertip across them in the air | root note (C3–C5) | level | HARP · NYLON · STEEL · BELL |
| **marbles** | flick from the ring around it to launch a marble | pinch on the ring and flick | energy: speed and how many bounces | level | FLICK · ONE A BAR · TWO A BAR · EVERY BEAT |
| **hum** | hum or sing into the microphone | — | octave, −2 to +2 | level | FOLLOW · NOTES · HARMONY · OCTAVES |
| **conductor** | tap its ring in time | beat time in the air; strikes are beats | — | how quickly the tempo follows | TEMPO · TEMPO + DYNAMICS |
| **air knob** | — | sits by any block; raise a hand to turn that block's ring | — | — | TURN · SLIDE · BOTH |
| **waterphone** | hold a rod to bow it, tap one to strike it, move or turn the puck to slosh the water | a resting fingertip bows, a fast one strikes, a sweep over the bowl tilts it, a strike over the bowl is a mallet on the dome | how much water | level | WHALE · STORM · GONG · GHOST |

**Theremin.** Two sine partials with a slow hand-tremor vibrato, silent until played, so
it never drones. FREE is a true theremin (continuous pitch); IN KEY quantises to the
table's scale, which is what makes it playable by a child; GLIDE adds a long portamento.
A first note also kicks any filter envelope, so it sits in a patch like any voice.

**Air drums.** Four pads around the puck: kick and snare below, hat and clap above, drawn
large enough to hit without looking. The kit is synthesised at start-up from the same
generators as the loops (a pitched sine drop, a noise-and-tone snare, a differentiated
noise hat, a three-burst clap, sine-sweep toms, a long crash). ON THE GRID snaps every hit
to the nearest sixteenth, so air drumming stays in time with the loops even with camera
latency. BIG KIT is heavier; TOMS makes the four pads four pitched toms.

**Harp.** Between nine and fifteen strings (two octaves of the current scale plus the
octave) fan out from the puck away from the centre, clipped at the rim. Each is a
Karplus–Strong string: a burst of noise circulating in a delay line the length of one
period, averaged by a two-point filter, so high strings ring shorter than low ones as a
real string does. Each pluck synthesises its own buffer once and caches it. The faces set
the damping and brightness: harp, nylon, steel, bell.

**Marbles.** Flick from the ring and a marble rolls off across the disc. The rim is a tone
circle: every bounce plays the note in key at that angle, on a plucked string. Everything a
marble hits also plays: an oscillator plucks a chord note, a loop slices, the drums hit a
pad, the harp plucks, a filter opens its envelope, anything else rings a note from its
angle. Marbles bounce off each other, lose energy slowly, and fade after a number of
bounces set by the turn. The auto faces launch marbles on the bar or on every beat, which
is a generative sequencer you can rearrange by moving blocks.

**Hum.** Sing and a synth line follows. Pitch is tracked by normalised autocorrelation
(2048 samples, the first strong peak after the correlation dips, parabolic interpolation,
gated on level), so the octave is right and silence is silence. FOLLOW slides with every
inflection; NOTES snaps to the scale and retriggers; HARMONY adds a third and a fifth in
key; OCTAVES adds an octave above and below. It has its own microphone input, separate
from the mic object.

**Conductor.** Beat time in the air (or tap its ring) and the whole table takes your tempo:
the spacing of the last few beats becomes the BPM, smoothed by the slider. On the second
face your hand's height is the dynamics: bring the table up and down like an orchestra.

**Air knob.** The camera version of a hand on a knob. Put it by a filter and raise your
hand: the filter opens. TURN, SLIDE or BOTH (height turns the ring, left-to-right slides
the arc).

**Waterphone.** Richard Waters's waterphone is a stainless bowl with a neck, brass rods
of different lengths welded round its rim, and water inside; bowed or struck, then tilted
so the water moves, it makes the sliding, inharmonic wail that scores half of horror
cinema. The model here is **modal**, built as per-sample DSP in the same AudioWorklet as
the analogue engines, so it runs in every sound mode:

- *Ten rods*, each a clamped-free bar with partials at 1 : 6.27 : 17.55 (the cantilever
  ratios), tuned inharmonically to each other so neighbouring rods beat, with decays of
  six, three and a half, and under two seconds.
- *The bowl*: fourteen shell modes in a bell-like inharmonic series, decaying for up to
  eight seconds, pulled down by a fifth when the bowl is full (mass loading).
- *The water* is a damped sloshing oscillator, about 1 to 1.6 Hz, driven by every tilt,
  turn, move and strike. Its displacement bends every partial by its own amount and sign
  (the bowl's low modes by up to twelve per cent, the rods by a few), damps the bowl when
  it washes over it, and adds a faint gurgle. That is the wail, and it carries on after
  you stop.
- *Bowing* is stick-slip approximated as a sawtooth locked to the rod's current,
  water-bent resonance, with bow scratch that follows speed and a subharmonic groan under
  heavy pressure. Light pressure (or the GHOST face) makes the second partial sing, the
  whistling harmonics players get by bowing near the tip.
- *Striking* is a short noise burst weighted toward the struck rod, or onto the bowl for a
  gong when a marble or an air strike lands on the dome.

Several fingers bow several rods. Faces: WHALE (bowing, the default), STORM (deep water
and random gusts, so it plays itself as a horror bed), GONG (bowl-heavy strikes, longer
decays), GHOST (harmonic bowing). A physical cube sloshes the water when you tilt it. Put
a **reverb** behind it; every recording of the real thing has one. The numerical test in
`tests/waterphone-dsp.test.js` checks the partial ratios, a bow's sustain and release, the
bend under a slosh, that ten hard bows plus dome strikes stay bounded, the faces, and the
cost (about two per cent of real time).

## How the hands are read

For each hand MediaPipe gives 21 landmarks. The instrument uses the palm centre (the mean
of wrist and knuckles), the index fingertip, a pinch (thumb tip to index tip, with
hysteresis, which is also the touch gesture for dragging blocks), an openness measure, and
a **height**:

- with the table camera, height is the hand's apparent size relative to its resting size
  (a hand rising toward the camera grows; the resting size is learned per hand and drifts
  slowly, never during a lift);
- at a webcam, height is simply height in the frame.

A **strike** is a fast fall in height followed by a stop: the detector arms when the
downward speed passes a threshold and fires when it drops back, taking the peak speed as
velocity. That one detector serves the drums and the conductor.

## Honest limits

- **The camera in the artifact.** MediaPipe's model files are fetched by the library at
  run time and the artifact sandbox blocks those fetches, so hand tracking works in the
  hosted build (GitHub Pages), not on claude.ai. Touch works everywhere.
- **Latency.** Hand tracking runs at roughly 15–25 frames a second on a phone, so an air
  drum hit lands 50–120 ms after the strike. ON THE GRID hides this musically; FREE is
  honest about it.
- **Two hands, not ten.** MediaPipe is set to two hands. The theremin, drums and harp are
  written for that; a crowd around the table plays with fingers on the glass as before.
- **Strikes are vertical.** A sideways swipe is not a hit (it plucks the harp instead). At
  a webcam, a strike is a drop in the frame, so the pad you hit is the one under your hand
  at the bottom of the stroke.
