export const waterFragmentShader = `
uniform sampler2D uWater;
uniform sampler2D uTerrainLayers;  // R: rock, G: gravel, B: sand, A: humus
uniform sampler2D uTerrainSurface; // R: height, G: rLevel, B: topType, A: pavement
uniform float uLayerPorosity[5];
uniform float uLayerPermeability[5];
uniform float uRain;
uniform float uSeaLevel;
uniform float uTime;
uniform vec2 uResolution;

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 texel = 1.0 / uResolution.xy;

    vec4 water = texture2D(uWater, uv);
    vec4 layers = texture2D(uTerrainLayers, uv);
    vec4 surface = texture2D(uTerrainSurface, uv);
    
    float th = surface.r; // pre-calculated total height for efficiency
    float rl = surface.g;
    float sw = water.r;
    float gw = water.g;

    // Calculate aCap based on layer thicknesses and porosities
    // ROCK: idx 0, GRAVEL: idx 1, SAND: idx 2, HUMUS: idx 3, PAVEMENT: idx 4
    float ac = layers.r * uLayerPorosity[0] + 
               layers.g * uLayerPorosity[1] + 
               layers.b * uLayerPorosity[2] + 
               layers.a * uLayerPorosity[3] + 
               surface.a * uLayerPorosity[4];

    float sL = th + sw;
    float gL = th - 0.5 + (ac > 0.0 ? (gw / ac) : 0.0);

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
        
        float nSL = nSurface.r + nWater.r;
        float sDiff = sL - nSL;
        if (sDiff > 0.0001) {
            float f = sDiff * 0.05;
            float clampedF = min(f, sw * 0.1);
            sDelta -= clampedF;
        } else if (sDiff < -0.0001) {
            float f = -sDiff * 0.05;
            float clampedF = min(f, nWater.r * 0.1);
            sDelta += clampedF;
        }

        // We also need nAC for nGL
        vec4 nLayers = texture2D(uTerrainLayers, nUv);
        float nAC = nLayers.r * uLayerPorosity[0] + 
                    nLayers.g * uLayerPorosity[1] + 
                    nLayers.b * uLayerPorosity[2] + 
                    nLayers.a * uLayerPorosity[3] + 
                    nSurface.a * uLayerPorosity[4];

        float nGL = nSurface.r - 0.5 + (nAC > 0.0 ? (nWater.g / nAC) : 0.0);
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
        float amt = min(sw, min(ac - gw, 0.001 * perm / 0.2)); // Adjusted for permeability (normalized to Humus 0.2)
        sw -= amt;
        gw += amt;
    }

    // Saturation
    if (gw > ac) {
        sw += (gw - ac);
        gw = ac;
    }

    gl_FragColor = vec4(sw, gw, 0.0, 1.0);
}
`;
