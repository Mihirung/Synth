# Tests

Headless end-to-end checks of the instrument, run in Chromium through Playwright with the
repo served from disk (no server needed).

```
node tests/advanced.test.js          # the advanced pucks: bindings, tuning, steps, euclid, scenes, motion, stems WAV, persistence, 8-bit markers
node tests/advanced-camera.test.js   # analogue engine with envelopes, pen pressure on the piano, synthetic camera frames (spawn, lift, lift-and-replace), mode switching
```

Each prints a PASS/FAIL line per check and exits non-zero on any failure or page error.
Screenshots land in `tests/shots/`. Set `PLAYWRIGHT_CHROMIUM` to your Chromium binary if
Playwright's own download is not present.
