# PrognosIQ — Predictive Maintenance Strategy Advisor

PrognosIQ is an independent research prototype for exploring predictive-maintenance and degradation-prognostics strategies across industrial assets.

**Live demo:**  
https://prognosiq-strategy-advisor.charanvaranasi44.workers.dev

## Features

### Strategy Selector

- Supports turbines, bearings, pumps, truck tires, and aircraft engines
- Compares five maintenance strategies:
  - Heuristic / threshold
  - Statistical
  - Physics-based
  - AI / ML
  - Hybrid physics + AI
- Uses a transparent, deterministic weighted-scoring model
- Displays suitability scores and individual score contributions
- Includes strengths, limitations, maturity, data requirements, and applicability
- Visualizes interpretability versus prediction capability

### Degradation Case Study

- Synthetic industrial time-series scenario
- Temperature, vibration, pressure, load, efficiency, and operating-hours signals
- Historical health, current degradation, forecast, and failure threshold
- Synthetic RUL, confidence, degradation rate, and maintenance window
- Interactive sensitivity analysis showing what changes the recommendation
- Comparison matrix for all five strategies

## Scoring Methodology

Each configuration input is normalized to a value between 0 and 100. Every strategy applies different deterministic weights:

```text
Suitability score = Σ(normalized input × strategy weight)
```

The highest-scoring strategy is recommended. No ML model is trained or executed.

## Technology

- React
- TypeScript
- Vite
- CSS
- Cloudflare Workers static assets
- Wrangler
