# 4. Building the physical table: a flat TV, a phone above it, no PC, no cables

The design here is the one Lumatable now supports natively: a television lying flat is the
table, an **Android phone mounted above it** is the camera *and* the computer, printed
markers on cubes are tracked by the page itself, and a thumb-and-forefinger **pinch** is a
touch. Nothing runs on a PC and nothing is wired except the TV's mains lead.

```
                 [ Android phone, camera down ]  ── casts its screen ──▶ (TV)
                              │  sees markers + hands
                              ▼
   ══════════════════════════════════════════════════  TV lying flat (the table)
        cubes with printed dot-markers on top faces      your hands over it
```

The original Reactable's rear-projection cabinet with a camera underneath is kept as an
appendix; this layout is far more flexible (any TV, any room, five-minute setup) and it
restores the original's cube-face semantics exactly: whatever face is **up** is the sound.

## 4.1 Bill of materials

| Part | Notes | Guide price |
|---|---|---|
| TV or large monitor | 43 to 55 in, laid flat on a low table or a purpose-built frame. Matte or lightly anti-glare screens are easier for the camera; glossy works with the lighting tips below. Any model that can receive a cast from your phone. | you may own one |
| Android phone | Recent mid-range or better (Chrome, a decent camera, enough CPU for audio + hand tracking). It runs the whole instrument. | you own one |
| Phone mount | A boom or overhead arm holding the phone 1.0 to 1.4 m above the screen, camera pointing straight down at the centre. A microphone boom stand with a phone clamp, a ceiling hook and a gooseneck, or a light stand with a horizontal arm all work. | £15 to £40 |
| Cubes / pucks | 50 to 70 mm cubes (wood, foam, 3D-printed) and a few flat pucks (coasters). Matte white top faces. | £10 to £30 |
| Marker sheet | Printed from the app (the **markers** chip) on matte white card, 100 % scale. | £2 |
| Speakers | Anything with a 3.5 mm or USB-C input; see the latency note below. | you may own some |
| Lighting | Even room light. Optionally one soft lamp above and to the side. | £0 to £20 |

Total: typically **£30 to £100** on top of a TV and phone you already have.

## 4.2 How it works, and why it's reliable

- **The phone's browser runs Lumatable** and casts its screen to the TV (Google Cast / screen
  mirroring, built into Android and most TVs). The phone's own screen shows the same table.
- **Markers are white discs with black dots**: a centre dot (position), a heading dot at
  the rim (rotation), and up to six inner dots (a 6-bit ID: 64 IDs, 14 object types × 4
  faces). The page's own detector finds bright discs on the dark screen at quarter
  resolution, then decodes the dots at full resolution inside each disc. Nothing is
  downloaded; there is no library. Because the TV's picture is dark and the markers are
  bright white, detection is unusually robust, and the moving UI under the cubes does not
  confuse it.
- **Calibration is four dots, then it looks after itself.** The first time the camera
  starts (and whenever you hold *recalibrate*), the screen goes black and shows one bright
  dot at a time in four corners of the disc; the phone finds each and computes the
  projective map from camera to screen. After that, four small dots flash in the dark
  screen corners for half a second every couple of minutes (and whenever you tap *refine*):
  because a mapping already exists, the phone knows where each dot should appear and only
  accepts a blob close to that prediction, so cubes can't be mistaken for one, and it
  rejects any solution that would jump the mapping by more than a small drift. The phone
  can creep on its boom or be re-hung roughly where it was, and the table stays aligned
  without bezel markers or permanently lit dots.
- **Rotation is physical.** Turning a cube turns its ring: the heading dot's angle is
  mapped through the same calibration, so it is correct however the phone is oriented.
- **Occlusion is forgiven.** A hand passing over a cube hides its marker for a moment; the
  object dims but stays put, and only disappears if unseen for 1.5 s. Lift a cube off the
  table and it is gone after that grace.
- **Pinch to touch.** On-device hand tracking (Google's MediaPipe Hands, loaded on demand)
  finds your hands in the camera image; bring thumb and forefinger together over the table
  and that point becomes a touch, exactly as a finger on a touchscreen would: drag a ring,
  slide an arc, tap a sequencer pad, swipe to cut a line, draw a waveform. A small ring
  follows each hand so you can see where the pinch will land. Hysteresis stops it fluttering.

## 4.3 Setting up

1. **Host the page over HTTPS.** Browsers only allow the camera on secure origins, so open
   the app from a hosted URL rather than a local file. The simplest no-PC route is GitHub
   Pages on this repository (Settings → Pages → deploy from the branch; the root
   `index.html` forwards to the instrument), which gives a permanent HTTPS link you can
   bookmark on the phone. The claude.ai artifact link also works for the instrument itself,
   but its sandbox does not pass the camera through, so use Pages (or any static host) for
   the table.
2. **Print the markers.** Tap **markers** in the header; print the sheet at 100 % on matte
   card. Cut out the discs with a small white margin and stick them on the tops of cubes and
   pucks. One object type per cube: its four faces are four variants (oscillator waveforms,
   filter modes, loop slots, sequencer patterns); the remaining two faces stay blank.
3. **Mount the phone** above the screen, camera down, roughly centred. Higher is better for
   coverage and for fewer hand occlusions; 1.0 to 1.4 m suits a 43 to 55 in screen with the
   phone's main camera. Lock the phone's screen rotation.
4. **Cast** the phone's screen to the TV. Then in Lumatable tap **camera**: the page goes
   fullscreen, keeps the phone awake, opens the rear camera and starts calibration. Keep
   the phone still for the four dots (about five seconds).
5. **Place a cube.** Its object appears where it sits. Turn it, and its ring turns.
6. **Pinch.** Hold a hand over the table; a ring follows it. Pinch over a block's ring or arc
   and move; release to let go.

Tap the small camera preview to hide it once everything is aligned. The **camera** chip
turns tracking off again; **calibrate** re-runs the four dots if you move the phone or TV.

## 4.4 Lighting, glare and other tuning

- Aim for **even, soft room light**. The detector adapts to local brightness, but a hard
  lamp reflecting in the TV glass makes a bright blob the calibration step can mistake for
  its dot; move the lamp off the camera's axis or diffuse it.
- **Marker size vs distance.** At 1280×720 the phone sees a 1.2 m wide screen at roughly
  1 px per mm, so the 60 mm discs are 60 px and the ID dots about 6 px: comfortable. If the
  phone must sit higher, print at 120 % (72 mm discs).
- **Keep the tops matte.** Gloss laminate reflects the TV and kills the dots.
- **Cubes 50 to 70 mm tall** lift the markers well above the glowing screen and are easy to
  grab and turn.
- If the TV is very bright, lower its backlight a little; the UI is designed for a dark disc.

## 4.5 Latency and audio

Casting adds 100 to 250 ms of video delay, which is fine for placing and turning objects.
Audio should not go through the cast: take it from the phone's headphone/USB-C output to
powered speakers (a wired link, the one cable worth keeping), or accept Bluetooth's extra
delay for casual play. For a stage, a USB-C to HDMI adapter carries video *and* audio to
the TV with a fraction of the delay, at the cost of one cable.

## 4.6 Appendix: the classic rear-projection build

The original Reactable used a translucent acrylic top with a projector and an infrared
camera underneath, tracking markers on the *bottom* faces via reacTIVision and TUIO. That
path still works with this software (`?tuio=ws://…` plus `prototype/tuio-bridge.js` on a
PC), and gives finger tracking on the surface and no hand occlusion, at the price of a
cabinet, a projector, IR illumination and a computer. The earlier bill of materials was
roughly £550 to £1,500. Choose it for a permanent installation; choose the TV-and-phone
build for anything you want to set up in an afternoon.
