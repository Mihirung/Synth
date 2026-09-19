# 10. The blocks, face by face

The main tray is the instrument's core: fourteen blocks, one job each. This is the reference
for what every one of them does, and for the faces added when the table was regrouped around
the bodies kit.

## The rule

Every object obeys the same three-part grammar, on screen and on the table:

- **The face is the mode.** Anything the object *chooses* is a face: which wave, which loop,
  which room, which scale. Faces are mutually exclusive by design, because a physical body
  can only have one face up. Tap the middle of a block to flip to the next face.
- **The turn is the continuous control.** Pitch, cutoff, feedback, size, tempo, probability.
  Turn the inner ring.
- **The slider is the level.** Level, mix, resonance, depth, volume. Slide the outer arc.

The one exception is the record blocks. Putting a physical one down is what arms it, so a tap
has to keep meaning *flip*, and on screen **rec** and **stems** arm on a **double tap**.

Two blocks read the same rule the other way round for historical reasons and were corrected
with the kit: **send** and **master** used to put their level on the ring. Both now have the
level on the slider, like everything else.

## Five gestures from the original table

These are not ours. They come from the Reactable Live! manual, and they are the tactile
half of the instrument: things your hands do to the table rather than to a particular
block. [docs/02](02-how-it-worked.md) quotes the manual.

- **Bump two blocks together to secure their connection.** Patching by proximity has an
  obvious flaw: a patch you built by placing things falls apart when you move them. The
  original's answer is the **hardlink**. Push a sequencer into an oscillator until they
  touch and the link between them turns **red** and stops caring about distance. Carry the
  sequencer to the far side of the table, put something closer in its way: it still plays
  that oscillator. Bump the two together a second time to let go. A hardlink lasts as long
  as both blocks are on the table.
- **Pull the slider's handle away from the block to lock it.** The manual gives the reason:
  a hand moving fast knocks the very parameter it just set. Drag the handle outward and it
  turns red and stops listening to fingers. Drag it outward again to unlock.
- **Hold a finger on a line to drop it out.** A swipe across a connection cuts it until you
  mend it, which is our old gesture and the original's first one. Resting a finger on the
  line instead mutes it only while the finger is down, so you can drop the drums out for two
  bars and bring them back by lifting your hand.
- **Turn an oscillator to play it.** On the original, rotating an oscillator set its pitch
  *and* triggered its envelope, and the envelope could be flat, in which case nothing
  happened. Ours is the same idea with the envelope as a separate object: an oscillator on
  its own drones, but put an **envelope** puck beside it and every new note you turn to is
  articulated. With PLUCK that is a plucked scale under your fingers. Take the envelope away
  and it goes back to droning.
- **Build a scale by ear on the key block.** See *key* below.

## Every face in one table

| Block | Faces | Turn | Slide |
|---|---|---|---|
| **osc** | SINE · SAW · SQUARE · TRIANGLE · PULSE · NOISE | pitch, in key (turning plays it, with an envelope beside it) | level |
| **loops** | KICK · BEAT · HATS · BASS · CHORD · ARP | which sixteenth the bar starts on | level |
| **rec** | 1 · 2 · 4 · 8 · 16 bars | where the loop starts | level |
| **mic** | LIVE · TUNED | — | level |
| **seq** | patterns A · B · C · D · E · F | shift the pattern | gate length |
| **filter** | LOW-PASS · HIGH-PASS · BAND-PASS · NOTCH · PEAK · VOWEL | cutoff, or the vowel | resonance |
| **delay** | 1/16 · 1/8 · dotted 1/8 · 1/4 · 1/2 · 1 BAR | feedback | mix |
| **dirt** | DRIVE · WARM · FUZZ · FOLD | drive | mix |
| **crush** | CRUSH · LO-FI | bits, 12 down to 2 | mix |
| **reverb** | ROOM · HALL · PLATE · SPRING · CATHEDRAL · GATED | size | mix |
| **mod** | RING · TREMOLO | frequency, or rate | mix |
| **chorus** | CHORUS · FLANGER · PHASER · VIBRATO | rate | mix |
| **lfo** | SINE · SAW · SQUARE · TRIANGLE, then the same four marked SYNC | rate | depth |
| **clock** (tempo) | TEMPO · SWING · CLICK | BPM, swing amount, or click pitch | click level |
| **song** | POP SONG · LITTLE SONG · BLUES · AABA · BUILD · FREE | which part to loop | song level |

The advanced pucks are in [docs/07-advanced.md](07-advanced.md), the hand and voice
instruments in [docs/08-play.md](08-play.md), the song timeline in
[docs/09-song.md](09-song.md). In the printed kit several of these share one body, because
their faces are modes of one thing: rec and stems are the **record** cube, mic and hum the
**voice** cube, dirt and crush the **dirt** cube, mod and chorus the **mod** cube, tempo and
the conductor the **clock** cube. See [hardware/README.md](../hardware/README.md).

## The generators

### osc

A tone in the current key. The ring sweeps four octaves upward from A1, quantised to the
scale, so it cannot play a wrong note; the little keyboard above it plays chromatically when
you want one.

Six waves, one per face:

- **SINE, SAW, SQUARE, TRIANGLE** are the classic four. In the analogue engines they are
  PolyBLEP band-limited with two detuned cores and a sub-oscillator.
- **PULSE** is a narrow pulse, 12.5 % duty, built additively from 24 harmonics. Thin, reedy
  and much brighter than the square: the sound a clavinet or a harpsichord starts from.
- **NOISE** is white noise through a resonant band-pass that sits on the note the ring is
  pointing at. It is noise you can play a tune with: wind at low settings, a snare or a
  hi-hat at the top, and something like a flute when the resonance is up. Each sequenced note
  gets its own filter, so it is polyphonic like the other waves.

A seventh wave has no face because you draw it: trace a shape beside an oscillator and it
becomes the tone, synthesised from 24 harmonics. Flipping the block leaves the drawn wave
behind; draw again to get it back.

Push two oscillators together and the outer one modulates the inner one's frequency.

**Turning it plays it.** With an **envelope** puck beside the oscillator, every new note you
turn to re-articulates: the original triggered its built-in envelope on rotation, and this is
that, with the envelope as an object you can take away. Without one the oscillator drones as
it always did.

### loops

Six bar-locked loops, one per face: KICK, BEAT, HATS, BASS, CHORD and ARP. They are
synthesised at start-up, follow the tempo, and follow the tuning puck.

**The ring is new**: it shifts where in the loop the bar begins, in sixteenths. Straight up is
the downbeat. Turn it two clicks and the loop starts two sixteenths in, so a straight beat
becomes a shuffle against everything else, and two loops of the same sample play against each
other. The readout says *from step 5* when it is shifted.

Imported audio appears as extra faces on screen (a loop of your own is fitted to the bar).

### rec

Records the whole table for a number of bars, then loops it. **The face is the length**: 1, 2,
4, 8 or 16 bars, which is a whole verse at the top setting. The ring shifts where the loop
starts, as it does for **loops**.

A **double tap** arms it; it starts on the next bar. On the physical table, putting the block
down arms it, and lifting it and putting it straight back records again.

With a **song** block on the table, a finished take does not loop. It pops out as a blob for
the song timeline instead. See [docs/09-song.md](09-song.md).

### mic

Live input, from the moment it is on the table.

- **LIVE** is your voice, unprocessed.
- **TUNED** is new. The block listens to its own pitch, works out the nearest note of the
  current key and scale, and pulls the voice there by the smallest interval that gets there.
  Sing roughly and it sings exactly; the readout shows the note it has landed on. It is the
  gentle end of auto-tune, not the robot end: it corrects to the scale you are already in, so
  a wide scale leaves more of your own pitch alone than a chromatic one does.

The advanced pucks work on the live voice too: **warp**, **envelope**, **express** and a
**seq** beside a mic all process the singing with nothing recorded first. See
[docs/07-advanced.md](07-advanced.md).

### key

The **key** block is our tonality object. The ring is the key, the eight faces are the scale
presets, the slider is the octave, and around the outside sit **twelve fields, one per
semitone**, the root at the top.

**Tap a field to put that note in or out of the scale.** The lit dots are the notes the whole
table is allowed to play; the ringed one is the root. A face loads a preset into the twelve
fields, and from there you can change it note by note until it is a scale of your own, which
is how the original's tonality object worked. Every oscillator, harp string, marble and
hummed note follows. The readout says *5 notes* rather than a scale name once you have edited
it.

This is the fastest way to find a mode by ear rather than by name, and it is the one place on
the table where a child can invent something that has no word for it yet.

### seq

Sixteen pads around the ring. Tap a pad for a note, pull it outward for a higher one, tap
again to clear it. With an **express** puck anywhere on the table the pads gain a third
state, so the cycle becomes off, on, accented, off, and the accents drive the velocity.

**Six patterns now, one per face** (A to F, where there were four). E is a bass line and F is
a set of offbeat stabs, so the bank covers a fuller arrangement before you edit anything. The
**chain** puck walks through them; the **steps**, **euclid** and **chance** pucks reshape
whichever is playing.

A sequencer beside an oscillator plays it, beside a loop slices it, beside a mic gates and
retunes the voice.

## The effects

### filter

Cutoff on the ring, 60 Hz to 12 kHz; resonance on the slider.

- **LOW-PASS, HIGH-PASS, BAND-PASS** are as they were. In the analogue engines these three
  run the ladder and state-variable models.
- **NOTCH** takes out a narrow band and leaves the rest. Sweep it against a chord and you get
  a phaser-like hollowing that keeps the bass.
- **PEAK** does the opposite: it lifts a band by 12 dB instead of cutting round it. Use it to
  find the ringing note in a loop.
- **VOWEL** is three band-passes on the formants of a human vowel, at the measured
  Peterson–Barney frequencies. The **ring morphs through a, e, i, o, u** rather than setting a
  cutoff, and the slider tightens the formants from a murmur to a talking-box. Put it after a
  saw oscillator and the table says vowels; put it after the drums for the classic funk
  filter.

An **envelope** puck beside a filter opens the cutoff on every note the table plays.

### delay

The six delay times are now **faces**, not a position on the ring: 1/16, 1/8, dotted 1/8,
1/4, 1/2 and a full bar. That matters on the physical table, because a delay time is a choice
and choices belong on faces.

The ring is therefore free, and carries **feedback**, up to 85 %. The slider is the mix. The
dotted eighth is the one that sounds like a guitar pedal on a stadium record; a full bar with
high feedback is a loop that will not decay.

In the analogue engines the repeats pass through a saturating shaper and a 3.6 kHz low-pass,
so each one is darker and fatter than the last, as a bucket-brigade or tape delay is.

### dirt

Four ways to break a sound, one per face, with the drive on the ring and the mix on the
slider:

- **DRIVE** is the original tanh curve: warm at the bottom, squashed at the top.
- **WARM** is asymmetric, so it makes even harmonics rather than odd ones. Much gentler. This
  is the one to put on a bass or a whole mix.
- **FUZZ** is a hard clip. Everything becomes a square wave; the level stops rising and the
  tone just gets angrier.
- **FOLD** is a wavefolder. Instead of flattening the peaks it turns them back on themselves,
  so as you turn it up the sound gains harmonics that move rather than pile up. It is the
  West Coast synth sound and it does something genuinely strange to a sine wave.

### crush

Bit reduction: 12 bits down to 2 on the ring, mix on the slider.

- **CRUSH** is the raw bit-crusher.
- **LO-FI** is new: the same bit reduction with a 2.6 kHz low-pass after it, which is roughly
  where a sampler from the late eighties gave up. Crush alone is harsh and bright; lo-fi is
  crush with the dust on it.

### reverb

Six rooms on six faces, with the size on the ring, from 0.4 to 4 seconds, and the mix on the
slider. Each is a different impulse, generated in the page from one noise source:

- **ROOM** is short, with seven discrete early reflections in the first 30 ms, so it sounds
  like a place rather than a wash.
- **HALL** is the original: a little pre-delay and a smooth exponential tail.
- **PLATE** is dense and bright, with the low end filtered out of the tail. The vocal reverb.
- **SPRING** flutters: the tail is chopped into bursts every 42 ms and rolled off at 2.6 kHz,
  which is what a spring tank in a guitar amplifier does.
- **CATHEDRAL** is twice as long as the hall and much darker, with 60 ms of pre-delay before
  anything comes back.
- **GATED** holds flat for three-quarters of its length and then shuts in a moment. The
  eighties snare.

### mod and chorus

These two blocks are the two halves of one body in the printed kit, and together they are six
ways to move a sound.

**mod** carries the two that multiply:

- **RING** is ring modulation, 20 Hz to 2 kHz. Metallic and bell-like, and inharmonic on
  purpose.
- **TREMOLO** is new: the same carrier slowed to 0.3 to 15 Hz and lifted so it never crosses
  zero, so the sound swings in level instead of being turned inside out.

**chorus** carries the four that delay:

- **CHORUS** is the original: a 22 ms delay swept slowly, thickening and widening.
- **FLANGER** is a 3 ms delay with 55 % feedback, which gives the jet-plane sweep.
- **PHASER** is four all-pass filters swept by the same LFO, notching the spectrum instead of
  combing it: rounder and more liquid than the flanger.
- **VIBRATO** is the same swept delay, but its mix takes the dry signal away rather than
  blending with it, so at the top of the slider you hear only the delayed copy and the pitch
  itself wobbles.

## The controllers

### lfo

Wobbles the nearest oscillator, filter or delay. Rate on the ring, depth on the slider.

**Eight faces**, which is why it is a truncated octahedron in the printed kit and not a cube:
the four shapes free-running (0.05 to 16 Hz) and then the same four locked to the beat (four
bars down to a sixteenth). Free-running is for texture, beat-locked for rhythm, and having
both on one body means one flip moves between them.

### clock (the tempo block)

Everything that sets the time, on one block.

- **TEMPO**: the ring is the BPM, 60 to 180, for the whole table.
- **SWING** is new. The ring sets a continuous swing from 0 to 35 %, and because the loops are
  synthesised in the page, the feel is baked back into them rather than applied on top. The
  header chip shows the percentage and takes the swing back to its three presets if you click
  it.
- **CLICK** is new: a metronome on every beat, accented on the bar. The ring is the pitch of
  the click, 500 Hz to 2 kHz, and the slider is its level. It goes straight to the speakers,
  past the compressor everything else runs through, so neither a rec block nor the header's
  record button can hear it. You can record to a click without recording the click.

On the printed kit this cube's last two faces are the **conductor**, which takes the tempo
from your hands. That is the same job by another route. See [docs/08-play.md](08-play.md).

### song

The rim becomes a song timeline, and the face is the shape of the song: POP SONG (88 bars),
LITTLE SONG (40), BLUES (48, four choruses of the twelve-bar), AABA (64, the 32-bar standard
twice), BUILD (72, the dance-floor shape) or FREE (64 unlabelled bars). See
[docs/09-song.md](09-song.md).

## What changed, and why

The table used to put some choices on the ring: which loop, how long a recording is, which
delay time, which tuning system. That works with a mouse and fails with a cube, because
turning a cube is continuous and imprecise while flipping one is exact. Regrouping the whole
instrument for the printed kit forced the question, and the answer moved every discrete choice
onto a face:

| Was | Now |
|---|---|
| loop chosen by turning | loop on the face; the ring shifts the bar's start |
| record length by turning | length on the face; the ring shifts the loop's start |
| delay time by turning | time on the face; the ring is feedback, the slider mix |
| tuning system by turning | system on the face; the ring is the reference A, the slider blends from equal temperament |
| key's scale on the slider | scale on the face; the slider is the octave |
| send and master level on the ring | level on the slider, like every other block |

Filling the faces then showed the gaps. Six faces on a filter wanted more than three shapes,
so notch, peak and the vowel filter arrived; six on a reverb wanted more than one room; six on
the oscillator wanted pulse and noise. Everything new in this document exists because a face
was empty and the answer to "what belongs here?" was obvious once the question was asked.
