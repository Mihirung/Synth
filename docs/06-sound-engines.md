# 6. Sound engines: the analogue models

Lumatable has a **sound** chip that switches the whole table between engines at runtime.
`original` is the Web Audio engine everything was built on. The four analogue engines are
real per-sample DSP running in an AudioWorklet (a ScriptProcessor fallback keeps them
working in non-secure contexts), built from the published models rather than from
browser primitives. They exist side by side deliberately: the brief was to be judged by
people who own the real instruments, and no one here could listen while building, so rival
theories of the same circuit ship together and the ear decides.

## What every analogue engine shares

**Oscillators.** Each note is two free-running cores at a random detune (about −4 to −7 and
+6 to +11 cents), plus a square sub-oscillator an octave down, mixed and run through a
transistor-style asymmetric soft clip. Saw, pulse and triangle are **PolyBLEP** anti-aliased
(triangle by leaky integration of the band-limited pulse), sine carries a touch of second
harmonic. Every core has an independent **random-walk pitch drift** (a VCO that is never quite
in tune with itself), slow pulse-width modulation where the engine calls for it, and a few
milliseconds of exponential **glide** between pitches. Envelopes are RC-shaped: exponential
attack and exponential release, per voice. The oscillator is polyphonic inside the model
(the sequencer, MIDI, the piano and the computer keys all stack voices), and a drone voice
carries the object's own pitch when nothing is playing it. Finger-drawn waveforms are
synthesised additively from 24 harmonics with per-harmonic Nyquist guarding.

**Output stage.** The master bus passes through an asymmetric tanh stage biased off centre
(even harmonics, the valve signature), mixed with the dry signal, then a one-pole "transformer"
roll-off, a DC blocker, a whisper of pinkish hiss and a trace of 50 Hz mains hum with its
second harmonic. Each engine sets its own drive, bias, tone and noise floor.

**Delays** get a bucket-brigade/tape feedback path in analogue modes (a saturating shaper and
a 3.6 kHz low-pass inside the loop, so repeats darken and smear). **Loops** carry a slow wow
on their playback rate.

## The four filters (the part that differs)

| Engine | Model | Theory | Character |
|---|---|---|---|
| **MOOG** | Stilson–Smith Moog ladder with Huovilainen-style tanh saturation, 2× oversampled | Stilson & Smith, *Analyzing the Moog VCF with considerations for digital implementation* (ICMC 1996); Huovilainen, *Non-linear digital implementation of the Moog ladder filter* (DAFx 2004). Coefficients follow the widely used Kellett formulation, with a cubic soft-limit on the fourth stage. | The classic: fat, bass drops away as resonance rises (authentic), singing self-oscillation at full resonance. Drifty oscillators with a strong sub. |
| **ZDF LADDER** | Zavalishin zero-delay-feedback TPT ladder, nonlinear, 2× oversampled | Zavalishin, *The Art of VA Filter Design* (Native Instruments); Pirkle's ladder implementation for the HP/BP tap mixes | Tighter, more precise cutoff tracking and cleaner at extreme settings; less drift, less sub. The "modern boutique" ladder. |
| **SEM** | Simper/Cytomic TPT state-variable filter (12 dB) | Simper, *Solving the continuous SVF equations using trapezoidal integration* (Cytomic, 2013) | Oberheim SEM character: gentler two-pole slope, pulse-width modulated oscillators, warm and open rather than dark. |
| **MS-20** | The same TPT SVF with a saturated resonance path | The Korg MS-20 topology, where the feedback diode clipper defines the sound | Aggressive, raw, screaming resonance that clips as it rises; hotter oscillator saturation and drive. |

All four are verified numerically (`prototype/index.html` carries the model; a Node test
extracts it): a 200 Hz tone through an 800 Hz low-pass passes while a 6 kHz tone is attenuated
by about 60 dB in the ladders and 36 dB in the two-pole filters, and every model
self-oscillates stably at full resonance and rings-but-decays at 85 %.

## Playing tips for the demo

- Put an oscillator on **saw** in **MOOG**, slide the filter's arc to maximum and turn its
  ring slowly: the filter sings on its own, and at max it becomes a sine source you can play
  from the sequencer.
- Push two oscillators together (proximity FM) in **MS-20** for the harshest textures.
- Hold chords on a MIDI keyboard or the A–L keys in **ZDF LADDER** for the cleanest pads.
- The **original** engine remains the safest on very old devices; the analogue engines cost
  more CPU (a per-sample model per object) and run in a worklet thread when the page is served
  over HTTPS or localhost.
