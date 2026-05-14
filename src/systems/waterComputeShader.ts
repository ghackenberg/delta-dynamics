export const waterFragmentShader = `
precision highp sampler2DArray;
uniform sampler2D uWater;
uniform sampler2DArray uTerrainLayers; 
uniform sampler2D uTerrainSurface; // R: height, G: rLevel, B: topType, A: aCap
uniform float uLayerPermeability[6];
uniform float uRain;
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

    vec2 offsets[4];
    offsets[0] = vec2(-texel.x, 0.0);
    offsets[1] = vec2(texel.x, 0.0);
    offsets[2] = vec2(0.0, -texel.y);
    offsets[3] = vec2(0.0, texel.y);

    for (int k = 0; k < 4; k++) {
        vec2 nUv = uv + offsets[k];
        if (nUv.x < 0.0 || nUv.x > 1.0 || nUv.y < 0.0 || nUv.y > 1.0) continue;

        vec4 nWater = texture2D(uWater, nUv);
        vec4 nSurface = texture2D(uTerrainSurface, nUv);
        
        float nSL = nWater.r; // Now storing sL in R
        float sDiff = sL - nSL;
        if (sDiff > 0.0001) {
            float f = sDiff * 0.15;
            float clampedF = min(f, sw * 0.2);
            sDelta -= clampedF;
        } else if (sDiff < -0.0001) {
            float f = -sDiff * 0.15;
            float clampedF = min(f, max(0.0, nWater.r - nSurface.r) * 0.2);
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

    // Boundary / Sea Level
    if (rl < -90.0 && th < -0.5) {
        if (uv.x < texel.x || uv.x > 1.0 - texel.x || uv.y < texel.y || uv.y > 1.0 - texel.y) {
            sDelta += (uSeaLevel - sL) * 0.025;
        }
    }

    // Apply deltas
    sw = max(0.0, sw + sDelta);
    gw = max(0.0, gw + gDelta);

    // River / Source logic (simulated by rl)
    if (rl > -90.0) {
        if (uv.x < 0.05) { 
            sw = max(0.0, rl - th); 
            gw = ac; 
        } else if (uv.x > 0.95) {
            sw = 0.0;
            gw = 0.0;
        }
    }

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
    gl_FragColor = vec4(sL, gw, sw, 1.0);
}
`;
