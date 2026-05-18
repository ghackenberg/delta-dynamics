import type { ShaderModule } from '../../utils/shaderUtils'
import { MAX_GPU_LAYERS } from '../../constants/gameConfig'

export const waterSimulationFragmentModule: ShaderModule = {
    name: 'waterSimulationFragment',
    defines: {
        MAX_LAYERS: MAX_GPU_LAYERS
    },
    fragment: {
        main: `
            precision highp sampler2DArray;
            uniform sampler2D uWater;
            uniform sampler2DArray uTerrainLayers; 
            uniform sampler2D uTerrainSurface; // R: height, G: rLevel, B: topType, A: aCap
            uniform float uLayerPermeability[6];
            uniform float uRain;
            uniform vec2 uRainBrushPos;
            uniform float uRainBrushSize;
            uniform float uRainBrushIntensity;
            uniform float uInflow;
            uniform float uSeaLevel;
            uniform float uTime;
            uniform vec2 uResolution;

            void main() {
                vec2 uv = gl_FragCoord.xy / uResolution.xy;
                vec2 texel = 1.0 / uResolution.xy;

                vec4 water = texture2D(uWater, uv);
                vec4 surface = texture2D(uTerrainSurface, uv);
                
                float th = surface.r; // pre-calculated total height for efficiency
                float rl = surface.g;
                float ac = surface.a;
                float sL = water.r;
                float gw = water.g;
                float sw = max(0.0, sL - th);

                sL = th + sw;
                float gL = th - 0.5 + (ac > 0.0 ? (gw / ac) * 0.5 : 0.0);

                // Surface Water Flow (Diffusion-like)
                float sDelta = 0.0;
                float gDelta = 0.0;

                vec2 offsets[8];
                offsets[0] = vec2(-texel.x, 0.0);
                offsets[1] = vec2(texel.x, 0.0);
                offsets[2] = vec2(0.0, -texel.y);
                offsets[3] = vec2(0.0, texel.y);
                offsets[4] = vec2(-texel.x, -texel.y);
                offsets[5] = vec2(texel.x, -texel.y);
                offsets[6] = vec2(-texel.x, texel.y);
                offsets[7] = vec2(texel.x, texel.y);

                for (int k = 0; k < 4; k++) {
                    vec2 nUv = uv + offsets[k];
                    if (nUv.x < 0.0 || nUv.x > 1.0 || nUv.y < 0.0 || nUv.y > 1.0) continue;

                    vec4 nWater = texture2D(uWater, nUv);
                    vec4 nSurface = texture2D(uTerrainSurface, nUv);
                    
                    float nSL = nWater.r; // Now storing sL in R
                    float sDiff = sL - nSL;
                    if (sDiff > 0.0001) {
                        float f = sDiff * 0.22;
                        float clampedF = min(f, sw * 0.3);
                        sDelta -= clampedF;
                    } else if (sDiff < -0.0001) {
                        float f = -sDiff * 0.22;
                        float clampedF = min(f, max(0.0, nWater.r - nSurface.r) * 0.3);
                        sDelta += clampedF;
                    }

                    float nAC = nSurface.a;
                    float nGL = nSurface.r - 0.5 + (nAC > 0.0 ? (nWater.g / nAC) * 0.5 : 0.0);
                    float gDiff = gL - nGL;
                    if (gDiff > 0.0001) {
                        float f = gDiff * 0.005;
                        float clampedF = min(f, gw * 0.25);
                        gDelta -= clampedF;
                    } else if (gDiff < -0.0001) {
                        float f = -gDiff * 0.005;
                        float clampedF = min(f, nWater.g * 0.25);
                        gDelta += clampedF;
                    }
                }

                // Rain
                sw += uRain * 0.0005;

                // Local Rain Brush
                if (uRainBrushPos.x >= 0.0) {
                    float dist = distance(uv * uResolution, uRainBrushPos);
                    if (dist < uRainBrushSize) {
                        float force = 1.0 - (dist / uRainBrushSize);
                        sw += uRainBrushIntensity * force * 0.01;
                    }
                }

                // Boundary / Sea Level
                if (uv.x < texel.x || uv.x > 1.0 - texel.x || uv.y < texel.y || uv.y > 1.0 - texel.y) {
                    // If below sea level, stabilize to sea level
                    if (th < uSeaLevel) {
                        sDelta += (uSeaLevel - sL) * 0.05;
                    } 
                    // If above sea level, allow water to flow off the map if there is a depth
                    else if (sw > 0.001) {
                        sDelta -= sw * 0.1; // "Open boundary" drain
                    }
                }

                // Source and Sink logic
                if (rl > 0.001) {
                    sw += uInflow * rl;
                    // Gradually saturate ground based on source intensity
                    gw = mix(gw, ac, clamp(rl, 0.0, 1.0));
                } else if (rl < -0.001) {
                    float drainFactor = clamp(abs(rl) * 0.2, 0.0, 0.95);
                    sw *= (1.0 - drainFactor);
                    gw *= (1.0 - drainFactor);
                }

                // Apply deltas
                sw = max(0.0, sw + sDelta);
                gw = max(0.0, gw + gDelta);

                // Infiltration (Using uLayerPermeability of top layer)
                int topIdx = int(surface.b + 0.5);
                float perm = uLayerPermeability[topIdx];

                if (sw > 0.0 && gw < ac) {
                    float amt = min(sw, min(ac - gw, 0.001 * perm / 0.2)); 
                    sw -= amt;
                    gw += amt;
                }

                // Saturation
                if (gw > ac) {
                    sw += (gw - ac);
                    gw = ac;
                }

                sL = th + sw;

                // Visual Extrapolation: Store sL in Alpha. 
                // Use weighted average by depth to prioritize deep pools over shallow rain.
                float totalWeight = sw > 0.001 ? sw : 0.0;
                float weightedSL = sw > 0.001 ? sL * sw : 0.0;

                for (int k = 0; k < 8; k++) {
                    vec2 nUv = uv + offsets[k];
                    if (nUv.x < 0.0 || nUv.x > 1.0 || nUv.y < 0.0 || nUv.y > 1.0) continue;
                    vec4 nWater = texture2D(uWater, nUv);
                    // nWater.b is sw (surface water depth) from previous step
                    if (nWater.b > 0.001) {
                        weightedSL += nWater.r * nWater.b;
                        totalWeight += nWater.b;
                    }
                }
                
                float visualSL = -100.0;
                if (totalWeight > 0.0) {
                    visualSL = weightedSL / totalWeight;
                }

                gl_FragColor = vec4(sL, gw, sw, visualSL);
            }
        `
    }
}
