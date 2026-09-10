# 09 · The song: a three-minute timeline around the rim

The table has always been a loop instrument: everything goes round and round. The **song**
block turns it into a place where a real song can be built, verse by verse, the way a
child would lay out a story.

## The idea

Place the **song** block (it sits in the main tray, between *mic* and *seq*). The rim of the
disc becomes a timeline of a pop song, clockwise from the top:

| part | bars | at 120 BPM |
|---|---|---|
| intro | 8 | 0:00 |
| verse 1 | 16 | 0:16 |
| chorus | 8 | 0:48 |
| verse 2 | 16 | 1:04 |
| chorus | 8 | 1:36 |
| middle 8 | 8 | 1:52 |
| last chorus | 16 | 2:08 |
| outro | 8 | 2:40 |

Eighty-eight bars: about three minutes at pop tempos (2:56 at 120 BPM, 3:09 at 112). The
parts are drawn as coloured arcs with their names along the inside of the band, with a
tick every bar and a longer one every four.

The rim is measured in bars, not seconds, on purpose. Everything else on the table is
locked to the bar clock, so a two-bar take always covers exactly two bars of the song at
whatever tempo the table is running.

## Blobs

A **rec** block normally records the table for a few bars and then loops the result. With
a song block on the table it does something else: when the take finishes, a **blob of
jelly** pops out beside the block. That blob *is* the recording. It bobs gently where it
is, wobbles when it moves, and squashes and stretches as you drag it, the way honey would
behave in zero gravity. The number in the middle is how many bars it holds; its name
(*take 1*, *take 2*…) sits underneath.

- **Drag a blob to the rim** and let go. It snaps to the nearest bar and sticks there. A
  label follows the finger while you drag (*BAR 21 · VERSE 1*) so you can see where it
  will land.
- **Before, after or on top.** The band is a classic four-track: four lanes, numbered at
  the top, with a line between each. A blob dropped on bars that are already taken goes
  into the next free lane, so takes stack. A blob can also half overlap another one.
- **Stretch a take.** Every blob on the rim has a grip at its end. Pull the grip along the
  edge and the blob grows a whole bar at a time; the take loops to fill the stretch, each
  repeat starting on the bar, with a tick where each repeat begins and the count in its
  label (*take 3 ×4*). A two-bar drum loop pulled out to the end of the song becomes the
  drums for the whole song; pulled to the end of the chorus, the drums for the chorus.
  Pull it back to shorten it, down to a single bar.
- **Tap a blob** to hear it on its own. Tap again to stop it.
- **Drag a blob off the rim** back onto the disc to take it out of the song. It floats
  again where you leave it.
- **Drag a blob right off the disc** to throw it away. The finger label says so before you
  let go.

A rec block can now take **1, 2, 4, 8 or 16 bars** (turn its ring): a whole verse in one go.

## Play, pause, stop, save

Three buttons appear at the origin while a song block is on the table:

- **▶ / ⏸** starts the song on the table's next bar, so live loops and the song share one
  grid. Pausing holds the current bar; pressing play again carries on from it.
- **■** goes back to the start.
- **⬇** renders the whole song to a file. The render is done offline in one go (an
  `OfflineAudioContext`), so it is exact and takes a moment, not three minutes. The file
  is an **MP3** when the encoder (lamejs, fetched from a CDN on first use) can load, and a
  **WAV** otherwise. Browsers have no MP3 encoder of their own, so this is the honest
  version of "save an MP3": online it is an MP3, offline it is a WAV any phone can play.

The readout under the buttons shows time, length and which part the head is in.

**Turn the song block's ring** to play just one part round and round (*loop CHORUS*): the
fastest way to build up a chorus layer by layer. Straight up is the whole song.

**Flip the song block** for a different shape, one per face of its cube: *POP SONG* (88
bars), *LITTLE SONG* (40 bars: intro, verse, chorus, verse, chorus, outro, for a shorter
attention span), *BLUES* (48 bars: four choruses of the twelve-bar), *AABA* (64 bars: the
32-bar standard, twice), *BUILD* (72 bars: intro, build, drop, break, build, drop, outro)
or *FREE* (64 unlabelled bars). Blobs keep their bar numbers when the shape changes.

## Overdubbing without doubling up

Song playback comes out of its **own bus**, which goes to the speakers, to the header
*record* button and to the meter, but never into the rec block's capture tap. So the
recipe for a real song is:

1. Record the drums. Drag the blob to the intro.
2. Press ▶. Record the bass while the drums play. The take contains only the bass.
3. Drag the bass blob on top of the drums. Repeat for the chords, the melody, the voice.

Nothing on the rim is ever re-recorded, so layers never pile up on themselves.

## What persists

Blobs are kept in IndexedDB (their audio, bars, lane, bar and position), so a reload
brings the song back exactly as it was. The song block itself lives in the scene like any
other block. Removing the song block stops playback and hides the rim; the blobs wait for
it to come back.

## Why not a grid?

The FruityLoops step grid (instruments × steps, each a button) is a fine way to write a
pattern, and the table already has it in the round: the **seq** block's sixteen pads,
pulled out for higher notes. What the grid never gave a child is the *shape* of a song.
The rim does: the parts are visible, named and the right length, and the whole thing is
one lap of the table. That is the thing worth learning first.

## Implementation notes

- `song` (state), `SONG_FORMS`, `songParts()`, `songLoopRange()`; `songAddBlob()` from
  `finishCapture()`; `songDropTarget()` and `songFreeLane()` for placement;
  `songSchedulePass()` and `songScheduleBlob()` for sample-accurate playback from
  `nextBarTime()`; `songTick()` for the jelly physics (a spring with honey damping) and the
  loop wrap; `songRender()` / `songExport()` for the file; `songSave()` / `songRestore()`
  for IndexedDB (database version 2, store `song`).
- The band is `TABLE_R × 0.87 … 0.985`, four lanes; anything dropped beyond 0.86 R
  snaps to the rim, beyond 1.04 R is the bin. A blob's `bars` is its take, `len` its stretch
  on the rim; `songScheduleBlob()` and `songRender()` repeat the take every `bars` bars up
  to `len`, and `songHandleAt()` / `songStretch()` are the grip.
- Tests: `tests/song.test.js` records a real take, drags blobs with the mouse, plays,
  measures the song bus, records a silent take while the song plays (isolation), renders,
  saves, reloads and checks everything came back.
