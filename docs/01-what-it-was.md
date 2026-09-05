# 1. What the instrument was

## Identification

The instrument is the **Reactable** (originally styled *reacTable*): a round, translucent,
back-projected tabletop with a pulsing white dot at its centre, played by placing physical
pucks and cubes onto the surface. Each object face carries a printed black-and-white
**fiducial marker** (the "amoeba" symbols, which look a little like organic QR codes). A camera
beneath the table tracks the markers; a projector beneath the table draws a live user
interface around each object: rotary arcs, faders, step-sequencer rings, note pickers, and
glowing connection lines that carry animated waveforms between objects and into the centre,
which is the master audio output. The centre dot pulses at the master tempo.

Every detail in the original description matches: rotation of an object changes its main
parameter (an oscillator's pitch, the tempo object's BPM), finger drags on the arc drawn
around an object adjust secondary parameters, and the melodic sequencer shows a small
piano-style note picker for programming melodies.

## History

- **2003 to 2007**: developed at the Music Technology Group (MTG), Universitat Pompeu Fabra,
  Barcelona, by Sergi Jordà, Martin Kaltenbrunner, Günter Geiger and Marcos Alonso
  (with Ross Bencina contributing to the vision framework). The stated ambition was to build
  the best computer-based musical instrument imaginable. Its conceptual precursor was
  Jordà's software synthesiser FMOL (1997 to 2002).
- **2007 to 2008**: **Björk's Volta world tour**. The Reactable debuted with her at Coachella in
  April 2007 and stayed in the live rig for the roughly 18-month tour, played on stage by
  producer Damian Taylor. This is what made the instrument famous.
- **2009**: **Reactable Systems SL** founded in Barcelona to commercialise it. Products:
  - **Reactable Live!** (flight-cased performance table, the S6 being the last version),
  - **Reactable Experience** (fixed installation version for museums and schools),
  - **Reactable Mobile** (iOS and Android app, same instrument with virtual objects,
    which is essentially Phase A of this project as a commercial product),
  - **ROTOR** (later iPad app using tangible controllers on the capacitive screen).
- **2022**: the company was dissolved after ceasing commercial operations. The tables are no
  longer sold or supported.

## What survives (and where)

Plenty survives, which is what makes a faithful rebuild feasible:

- **The full product manuals** are still served from the legacy site, with one page per
  object type, for example the
  [general interaction manual](https://reactable.com/live/manual/general.html),
  [Sequencer](http://reactable.com/live/manual/sequencer.html),
  [Filter](http://reactable.com/live/manual/filter.html),
  [LFO](http://reactable.com/live/manual/lfo.html),
  [Sampler](http://reactable.com/live/manual/sampler.html) and
  [Modulator](http://reactable.com/live/manual/modulator.html), plus the
  [Reactable Mobile manual](http://reactable.com/mobile/manual/general.html) and the
  [ROTOR manual](https://reactable.com/rotor/manual/chapter5.html).
  These are the behavioural specification for the rebuild. (Mirror them early; the site is
  legacy and could disappear. The Wayback Machine also holds copies.)
- **The academic papers**, which describe the internals the manuals do not:
  - [The reacTable* (ICMC 2005)](https://modin.yuri.at/publications/reactable_icmc2005.pdf)
  - [The reacTable*: A Collaborative Musical Instrument (TICE 2006)](https://modin.yuri.at/publications/reactable_tice2006.pdf)
  - [reacTIVision: a computer-vision framework for table-based tangible interaction (TEI 2007)](https://modin.yuri.at/publications/reactivision_tei2007.pdf)
  - [Dynamic Patches for Live Musical Performance (NIME 2004)](https://www.nime.org/proceedings/2004/nime2004_019.pdf),
    which specifies the automatic connection model.
  - [The reactable: Tabletop Tangible Interfaces for Multithreaded Musical Performance](https://www.researchgate.net/publication/228572127_The_reactable_Tabletop_Tangible_Interfaces_for_Multithreaded_Musical_Performance)
- **The tracking software itself**: [reacTIVision](https://reactivision.sourceforge.net/) and
  the [TUIO protocol](https://tuio.org/) were always open source (GPL) and are still
  maintained by Martin Kaltenbrunner on
  [GitHub](https://github.com/mkalten/reacTIVision). The printable fiducial marker set ships
  with it. This is the part of the original system we do not have to rebuild at all.
- **Institutional pages**: the [MTG's Reactable page](https://www.upf.edu/web/mtg/reactable)
  and the [legacy company site](http://reactable.com/).
- **Secondary sources**: [Wikipedia](https://en.wikipedia.org/wiki/Reactable),
  [HowStuffWorks' teardown-level explainer](https://electronics.howstuffworks.com/gadgets/audio-music/reactable.htm),
  CDM's coverage of [Björk's setup](https://cdm.link/bjork-reactable-and-lemur-tangible-interactive-musical-fun/)
  and [reacTIVision releases](https://cdm.link/free-tangible-tracking-reactivision-14-here-tuio2-coming-soon/),
  and a large body of YouTube performance and demo footage for pixel-level UI reference.

## What does not survive

The instrument application itself (graphics, connection manager, sound engine) was
proprietary and was never released, neither as source nor as a working download for modern
systems. That application is what this project rebuilds. Everything below it (vision,
protocol, marker set) and everything above it (documented behaviour) is available.
