# Decentralized Biosphere Digital Twin (DBDT)

A zero-dependency, client-side simulation laboratory for exploring soil hydrology, micro-climate stress, roots, carbon, and community ecological interventions.

## v0.2: Reproducible Scenario Laboratory

DBDT v0.2 adds three repeatable scenarios:

- **Baseline Garden** — a balanced reference state for comparison.
- **Heavy Rainfall** — tests infiltration, runoff, and water-retention interventions.
- **Heat & Drought** — tests deep roots, carbon, and fungal transport under high atmospheric demand.

Use the **Scenario Laboratory** controls to select a scenario, reset the simulation, and replay the same seeded climate sequence. Outputs are illustrative model values, not field measurements or agronomic prescriptions.

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
