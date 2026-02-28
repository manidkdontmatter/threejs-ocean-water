# Settings Reference

Source of truth: `packages/web-ocean-water/src/ocean/types.ts` (`DEFAULT_OCEAN_SETTINGS`).

## `OceanSettings` Default Values

## Wave Motion

| Key | Default | Notes |
| --- | --- | --- |
| `seaLevel` | `0` | World-space water baseline height. |
| `waveAmplitude` | `1.28` | Final height scale from normalized wave value. |
| `waveMean` | `0.56` | Mean wave level before amplitude scaling. |
| `dragMultiplier` | `0.28` | Position advection per octave for sharper/choppier waves. |
| `baseFrequency` | `1.0` | Frequency for octave 0. |
| `frequencyMultiplier` | `1.18` | Frequency growth between octaves. |
| `baseTimeMultiplier` | `2.0` | Time speed at octave 0. |
| `timeMultiplierGrowth` | `1.07` | Time-speed growth between octaves. |
| `weightDecay` | `0.82` | Weight falloff between octaves. |
| `waveDirectionSeed` | `0.0` | Direction phase seed for octave direction generation. |
| `phaseOffset` | `0.0` | Time phase offset. |
| `displacementOctaves` | `10` | Octaves used for geometric displacement and default headless sampling. |
| `normalOctaves` | `24` | Octaves used for shading normals in the fragment shader. |
| `normalEpsilon` | `0.08` | Finite-difference step for normal reconstruction. |
| `highFrequencyFadeDistance` | `350.0` | Camera distance where high-frequency displacement fade starts. |
| `highFrequencyFadeStrength` | `0.92` | Strength of high-frequency distance fade. |

## Shading and Color

| Key | Default | Notes |
| --- | --- | --- |
| `fresnelBase` | `0.04` | Base reflectance term. |
| `fresnelPower` | `5.0` | Fresnel falloff exponent. |
| `reflectionStrength` | `1.0` | Reflection contribution scale. |
| `scatterStrength` | `1.0` | Scattering/base-water color scale. |
| `skyStrength` | `0.7` | Atmosphere contribution scale used by ocean + sky shaders. |
| `toneMapExposure` | `2.1` | Internal ACES tonemap exposure multiplier. |
| `shallowColor` | `"#3b8ac5"` | Color for shallower/scatter-biased regions. |
| `deepColor` | `"#093a7a"` | Color for deeper water regions. |
| `foamEnabled` | `true` | Enables foam shading layer. |
| `foamThreshold` | `0.12` | Slope threshold for foam buildup. |
| `foamIntensity` | `0.55` | Foam blend intensity. |
| `foamColor` | `"#dff7ff"` | Foam color. |
| `skyHorizonColor` | `"#9dc7ea"` | Horizon gradient color. |
| `skyZenithColor` | `"#2e5e96"` | Zenith gradient color. |
| `farFadeStart` | `460.0` | Distance where water starts blending toward sky color. |
| `farFadeEnd` | `1050.0` | Distance where far fade reaches full strength. |

## Sun

| Key | Default | Notes |
| --- | --- | --- |
| `sunIntensity` | `1.2` | Sun lighting intensity term. |
| `sunGlowPower` | `660.0` | Sun highlight/glow exponent. |
| `sunGlowIntensity` | `210.0` | Sun highlight/glow intensity. |
| `sunElevationDeg` | `34.0` | Sun elevation angle in degrees. |
| `sunAzimuthDeg` | `20.0` | Sun azimuth angle in degrees. |
| `animateSun` | `false` | Enables azimuth animation over time. |
| `sunOrbitSpeed` | `0.1` | Orbit speed factor applied to animated azimuth. |

## Geometry and Follow Behavior

| Key | Default | Notes |
| --- | --- | --- |
| `ringCount` | `6` | Number of concentric LOD rings. |
| `baseRingWidth` | `42.0` | Width of center ring. |
| `ringWidthGrowth` | `1.66` | Ring width multiplier per ring. |
| `centerRadialSegments` | `24` | Radial segments for center ring. |
| `radialSegmentsDecay` | `0.8` | Radial segment decay factor by ring index. |
| `minRadialSegments` | `4` | Lower bound for ring radial segments. |
| `angularSegments` | `256` | Angular segments for each ring. |
| `detailFalloff` | `0.82` | Detail scale falloff by ring index. |
| `followSnap` | `1.0` | Grid step used when snapping ocean center to camera X/Z. |
| `followCameraEveryFrame` | `false` | If `true`, follows camera continuously instead of snapping. |

## Debug

| Key | Default | Notes |
| --- | --- | --- |
| `wireframe` | `false` | Enables wireframe material mode. |
| `debugView` | `"none"` | Debug shading mode: `none`, `normals`, `height`, `fresnel`, `rings`. |

## Grouped Config Sections (`OceanConfig`)

`OceanConfig` lets you set grouped partials instead of flat keys.

- `wave`: wave motion keys
- `shading`: shading/color keys
- `sun`: sun keys
- `geometry`: mesh/follow keys
- `debug`: debug keys

Use `ocean.getConfig()` for a grouped snapshot and `ocean.setConfig(...)` for grouped updates.

## Wave Sampling Params (`WaveSamplingParams`)

Headless samplers use this reduced subset:

- `seaLevel`
- `waveAmplitude`
- `waveMean`
- `dragMultiplier`
- `baseFrequency`
- `frequencyMultiplier`
- `baseTimeMultiplier`
- `timeMultiplierGrowth`
- `weightDecay`
- `waveDirectionSeed`
- `phaseOffset`
- `displacementOctaves`

Notably excluded from headless sampling:

- `normalOctaves`
- `normalEpsilon`
- `highFrequencyFadeDistance`
- `highFrequencyFadeStrength`

Those are render-side controls.

## `OceanSkyOptions` Default Values

`createDefaultOceanSkyOptions()` defaults:

| Key | Default |
| --- | --- |
| `skyHorizonColor` | `"#9dc7ea"` |
| `skyZenithColor` | `"#2e5e96"` |
| `sunIntensity` | `1.2` |
| `sunGlowPower` | `660.0` |
| `sunGlowIntensity` | `210.0` |
| `skyStrength` | `0.7` |
| `toneMapExposure` | `2.1` |
