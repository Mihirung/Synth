# 4. Building the physical table (Phase B)

The software is ready for this today: the prototype accepts a live TUIO stream
(`?tuio=ws://localhost:8765` plus `prototype/tuio-bridge.js`), so the hardware project is
purely about getting reacTIVision a clean infrared view of markers on a surface, and
getting the interface projected onto that same surface. This is the classic
diffused-illumination (DI) build the multi-touch community documented extensively in the
2008 to 2012 era; every part is still cheap and available.

## 4.1 How the sandwich works

```
        cubes and pucks with printed fiducials on their faces
  ══════════════════════════════════════════════════════  acrylic + diffuser
       ↑ IR floodlight (850 nm) reflects off markers          (the table top)
       │ and fingertips touching the surface
   [IR LEDs]      [camera + 850 nm band-pass filter]
                          [projector] → [mirror] → back-projects the UI
                     (all inside a light-tight cabinet)
```

The diffuser is the trick: objects and fingers in contact with the surface are sharp to
the camera, while everything above it blurs away. The camera wears an IR-pass filter so it
never sees the projected image; the projector emits almost no IR, so the two share the
surface without interfering.

## 4.2 Bill of materials (realistic 2026 prices)

| Part | Spec | Guide price |
|---|---|---|
| Surface | 8 to 10 mm clear acrylic, circle 700 to 900 mm diameter | £60 to £120 |
| Diffuser | Tracing paper / drafting film / Rosco Grey rear-projection film laminated under the acrylic | £10 to £60 |
| IR illumination | 850 nm LED strip or 4 to 6 IR floodlight modules, angled for even coverage, diffused | £20 to £50 |
| Camera (budget) | Sony PS3 Eye, IR-cut filter removed, 850 nm band-pass added; 640×480 at 60 fps | £15 to £25 |
| Camera (better) | Global-shutter mono USB module (OV9281 class, 1280×800 at 120 fps) + M12 lens + 850 nm filter | £50 to £90 |
| Projector | Short-throw or ultra-short-throw 1080p (the dominant cost; UST removes the mirror) | £300 to £700 |
| Mirror | First-surface mirror if using a standard short-throw | £30 to £60 |
| Cabinet | Plywood cylinder or box, matt black inside, ventilated | £50 to £150 |
| Cubes and pucks | 3D-printed or laser-cut 40 to 50 mm cubes; matte white faces | £20 |
| Computer | Anything that runs a browser and reacTIVision; a mini PC or the laptop you have | £0 to £250 |

Total: roughly **£550 to £1,500**, dominated by the projector. A "monitor build" (flat LCD
panel instead of projection) does not work for this design: the camera must see through
the surface from below, which an LCD blocks.

## 4.3 Build steps

1. **Cabinet and surface.** Build the enclosure so the camera and projector both cover the
   full disc: camera centred below, projector bounced off the mirror (or UST projector
   direct). Blacken the interior; any internal IR reflection becomes tracking noise.
2. **Projection first.** Get the projected image filling the disc and keystone-corrected.
   Run the prototype full-screen (it scales its stage to the window); mask the projector
   overshoot with the cabinet rim.
3. **Camera and IR.** Remove the PS3 Eye's IR-cut filter (well-documented hack), fit an
   850 nm band-pass (a piece of exposed, developed film negative works in a pinch;a proper
   filter is £10). Mount the IR lights low and angled so illumination is even; diffuse them
   (baking paper works) to avoid hotspots, which reacTIVision sees as blobs.
4. **reacTIVision.** Run it, open its calibration grid (`c`), and align camera space to the
   projected surface. Tune the thresholder (`t`) until fiducials read solidly at the rim.
   Set the frame rate to the camera's real rate. It broadcasts TUIO on UDP 3333 out of the
   box.
5. **Bridge and browser.** `npm install ws && node prototype/tuio-bridge.js`, then open the
   prototype with `?tuio=ws://localhost:8765`. Fiducial class IDs map to object types in
   blocks of eight (0 to 7 oscillator, 8 to 15 sampler, 16 to 23 sequencer, 24 to 31
   filter, 32 to 39 delay, 40 to 47 modulator, 48 to 55 LFO), so print accordingly.
6. **Cubes.** Print the amoeba fiducials (shipped with reacTIVision, `symbols/` directory)
   at 40 mm or larger, matte (gloss kills tracking), one per face. A cube whose six faces
   carry six sampler-block IDs recreates the original's "turn the cube for a different
   sound" exactly. Leave a white border of at least 8 mm around each symbol.
7. **Fingers.** reacTIVision also tracks fingertips and sends TUIO cursor events. The
   prototype currently takes touch from the browser's own pointer events; wiring TUIO
   cursors into the same handlers is the one small software task left for Phase B, noted
   below.

## 4.4 Remaining software work for Phase B

- Map TUIO `2Dcur` (finger) events into the existing pointer pipeline (the object pipeline
  is done). Small, isolated change in the TUIO client section of the prototype.
- A calibration overlay (draw the four reacTIVision grid points from the browser side) to
  make alignment quicker.
- Optionally lock the on-screen dock away in table mode (`?tuio=` already implies physical
  objects; hiding the tray is one CSS toggle).

## 4.5 References

- reacTIVision and its calibration guide: https://reactivision.sourceforge.net/
- TUIO protocol: https://tuio.org/
- PS3 Eye IR conversion: https://cdm.link/trick-out-your-ps3-eye-webcam-best-cam-for-vision-augmented-reality/
- The original hardware description: the TEI 2007 paper (see docs/01).
