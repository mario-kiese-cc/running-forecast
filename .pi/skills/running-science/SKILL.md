---
name: running-science
description: Running performance prediction formulas, training science, and physiological models. Use when implementing race prediction, training analysis, or any running-science computation.
---

# Running Science Reference

## Race Prediction Models

### Riegel Formula (1981)
The most widely used race equivalence formula.

```
T2 = T1 × (D2 / D1) ^ 1.06
```

- `T1`: known race time (seconds)
- `D1`: known race distance (meters)
- `T2`: predicted race time (seconds)
- `D2`: target race distance (meters)
- Exponent `1.06` is the fatigue factor; can be adjusted (1.01–1.15) based on runner profile

**Limitations:** Less accurate for ultra distances (>42.195 km) and when extrapolating across very different distances (e.g., 800m → marathon).

### Cameron Formula
An alternative with distance-specific correction factors.

```
T2 = T1 × (a + b × D2^c) / (a + b × D1^c)
```

Where `a = 13.49681`, `b = -0.048865`, `c = 1.0` (simplified). More complex versions exist.

### VO2max-based Prediction (Daniels/Gilbert)
Estimates VO2max from a race result, then predicts other distances.

```
VO2max = (-4.60 + 0.182258 × velocity + 0.000104 × velocity²) / 
         (0.8 + 0.1894393 × e^(-0.012778 × time) + 0.2989558 × e^(-0.1932605 × time))
```

Where `velocity` is in meters/minute and `time` is in minutes.

## Standard Race Distances

| Name | Distance (m) | Distance (km) |
|------|-------------|---------------|
| 1500m | 1500 | 1.5 |
| Mile | 1609.34 | 1.609 |
| 3000m | 3000 | 3.0 |
| 5K | 5000 | 5.0 |
| 10K | 10000 | 10.0 |
| 15K | 15000 | 15.0 |
| Half Marathon | 21097.5 | 21.0975 |
| Marathon | 42195 | 42.195 |
| 50K | 50000 | 50.0 |

## Pace & Speed Conversions

```
pace (sec/km) = time (sec) / distance (km)
speed (km/h) = 3600 / pace (sec/km)
pace (min:sec/km) = floor(pace/60) + ":" + (pace mod 60).padStart(2, "0")
```

## Training Zones (Daniels)

Based on VDOT (a proxy for VO2max from race results):

| Zone | Name | % of VO2max | Purpose |
|------|------|-------------|---------|
| E | Easy | 59–74% | Aerobic base, recovery |
| M | Marathon | 75–84% | Marathon-specific endurance |
| T | Threshold | 83–88% | Lactate threshold improvement |
| I | Interval | 95–100% | VO2max development |
| R | Repetition | 105–120% | Speed and economy |

## Training Load Metrics

### Acute Training Load (ATL)
Rolling 7-day sum of training stress (distance × intensity factor).

### Chronic Training Load (CTL)
Rolling 42-day exponentially weighted average of training stress.

### Training Stress Balance (TSB)
```
TSB = CTL - ATL
```
- Positive TSB → fresh/recovered
- Negative TSB → fatigued
- Race-ready window: TSB between +10 and +25

## Implementation Notes

- Always store times in **seconds** (float64) internally
- Always store distances in **meters** (float64) internally
- Use **epsilon comparison** for floating point equality (ε = 0.001 for seconds)
- Pace display format: `M:SS/km` (e.g., `4:30/km`)
- Time display format: `H:MM:SS` for races > 1 hour, `MM:SS` for shorter
