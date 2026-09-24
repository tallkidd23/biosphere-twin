# Decentralized Biosphere Digital Twin (DBDT)

A zero-dependency, client-side simulation laboratory for exploring soil hydrology, micro-climate stress, roots, carbon, and community ecological interventions.

## v0.3: Living Processes

DBDT v0.3 makes model causality visible. The canvas now includes process focus modes, pause/step/speed controls, recent metric deltas, causal event particles, and click-to-inspect local cells.

### Focus modes

- **All processes** — full ecological cross-section.
- **Water** — infiltration, capillary movement, drainage, and runoff.
- **Roots** — root biomass and uptake pulses.
- **Mycelium** — fungal transport network traces.
- **Carbon** — organic-matter pockets and retention zones.
- **Runoff** — surface overflow and watershed exits.

The animated marks are linked to model events rather than decorative motion. Outputs remain illustrative model values, not field measurements, forecasts, or agronomic prescriptions.

## Model contract

- The model runs locally in the browser; no telemetry or account is required.
- Water is represented as a bounded cell field. Percolation, runoff, evaporation, and root extraction are tracked in the simulation ledger.
- Climate values are synthetic scenario parameters, not a weather forecast.
- Soil organic matter, root density, and mycelium are simplified exploratory state variables.
- Results should be calibrated against site observations before real-world decisions are made.

## Run locally

Open `index.html` in a modern browser or publish the repository with GitHub Pages.

## License

CC0 1.0 Universal. Public domain dedication for educational, community, and scientific stewardship.
