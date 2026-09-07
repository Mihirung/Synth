# Tests

Headless end-to-end checks of the instrument, run in Chromium through Playwright with the
repo served from disk (no server needed).

```
node tests/advanced.test.js          # the advanced pucks: bindings, tuning, steps, euclid, scenes, motion, stems WAV, persistence, 8-bit markers
node tests/advanced-camera.test.js   # analogue engine with envelopes, pen pressure on the piano, synthetic camera frames (spawn, lift, lift-and-replace), mode switching
node tests/play.test.js              # the play tray: drums, harp, theremin, marbles, hum, and synthetic hand landmarks
node tests/waterphone-dsp.test.js    # the waterphone model, numerically: strike, bow, water bending, stress, faces, speed (no browser)
node tests/waterphone.test.js        # the waterphone in the browser: bow, strike, slosh, hands, marbles, persistence
```

Each prints a PASS/FAIL line per check and exits non-zero on any failure or page error.
Screenshots land in `tests/shots/`. Set `PLAYWRIGHT_CHROMIUM` to your Chromium binary if
Playwright's own download is not present.
