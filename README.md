# Synth: rebuilding a Reactable-style tangible modular synthesiser

This repository contains research and a build plan for recreating the software behind the
**Reactable**, the tabletop tangible modular synthesiser developed at the Music Technology
Group, Universitat Pompeu Fabra (Barcelona), and famously played on Björk's Volta tour
(2007 to 2008). The company that commercialised it, Reactable Systems SL, ceased trading and
was dissolved in 2022, but the underlying tracking technology is open source and the
instrument's behaviour is thoroughly documented in academic papers, the archived product
manuals, and hundreds of videos.

The goal here is a **clean-room reimplementation**, built virtual-first:

1. **Phase A (virtual)**: a purely software instrument. Virtual cubes are dragged, rotated and
   flipped on a circular on-screen stage using mouse or touchscreen, and a virtual analog
   synthesis engine responds exactly as the original table did.
2. **Phase B (physical, later)**: the same software driven by a real camera-tracked table.
   Physical cubes carrying printed fiducial markers sit on a back-projected multi-touch
   surface, tracked by the open-source reacTIVision framework.

The architecture is designed so Phase B needs **no changes to the instrument itself**: all
surface input (virtual or physical) flows through one abstraction modelled on the TUIO
protocol, which is exactly how the original Reactable separated its vision system from its
synthesiser.

## Documents

| Document | Contents |
|---|---|
| [docs/01-what-it-was.md](docs/01-what-it-was.md) | Identification, history, Björk's use, company timeline, where the documentation survives |
| [docs/02-how-it-worked.md](docs/02-how-it-worked.md) | The original architecture: hardware, reacTIVision, TUIO, dynamic patching, the object set and interaction model |
| [docs/03-rebuild-plan.md](docs/03-rebuild-plan.md) | Proposed architecture, technology choices, phased plan with effort estimates, hardware path, legal notes |

## Status

Research complete. No code yet; the next step is the Phase 0 spike described in the rebuild
plan (one oscillator cube on a circular stage, making sound).
