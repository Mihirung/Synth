# Tests

Headless end-to-end checks of the instrument, run in Chromium through Playwright with the
repo served from disk (no server needed).

```
node tests/advanced.test.js          # the advanced pucks: bindings, tuning, steps, euclid, scenes, motion, stems WAV, persistence, 8-bit markers
node tests/advanced-camera.test.js   # analogue engine with envelopes, pen pressure on the piano, synthetic camera frames (spawn, lift, lift-and-replace), mode switching
node tests/play.test.js              # the play tray: drums, harp, theremin, marbles, hum, and synthetic hand landmarks
node tests/waterphone-dsp.test.js    # the waterphone model, numerically: strike, bow, water bending, stress, faces, speed (no browser)
node tests/waterphone.test.js        # the waterphone in the browser: bow, strike, slosh, hands, marbles, persistence
node tests/phone.test.js             # iPhone layout: tray pages, tap-to-place, back
node tests/help.test.js              # the ? panel's tabs, desktop and phone
node tests/lines.test.js             # cutting and mending lines by touch, purple reach
node tests/spheres.test.js           # the orrery: moon counts, Kepler ratios, Holst touches, God-mode physics and collisions, ships
node tests/song.test.js              # the song: a real take becomes a blob, blobs onto the rim by mouse, play/pause/stop, bus isolation, render and save, reload
node tests/micwarp-dsp.test.js       # the live voice processor (pucks on a mic), numerically: the shifter, the seq's gates, envelope words, express vibrato/bright/tremolo (no browser)
node tests/micwarp.test.js           # pucks beside a mic block: a fake microphone's 220 Hz comes out at 440 under warp, a seq gates it, envelope and express bind, unbinding and rebuilds
node tests/phone.test.js             # iPhone emulation: trays as pages of the dock, tap-to-place, back; desktop drawers still stack
```

Each prints a PASS/FAIL line per check and exits non-zero on any failure or page error.
Screenshots land in `tests/shots/`. Set `PLAYWRIGHT_CHROMIUM` to your Chromium binary if
Playwright's own download is not present.
node tests/help.test.js               # the ? help panel: tabs, open and close, desktop and phone
