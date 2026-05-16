# Refactoring Proposal - Delta Dynamics

This document outlines the proposed architectural changes to improve maintainability, performance, and scalability of the game engine.

## 1. State Management (Zustand Splitting)

### Current Issue
`useStore.ts` is a "God Object" managing 30+ state variables and containing complex logic for building placement, terrain painting, and the main game tick. This makes it hard to test and maintain.

### Proposed Solution
Split the store into functional slices or separate stores:
- **`useGameStore`**: Resources, time, buildings, humans, animals, and core terrain data.
- **`useEditorStore`**: Brush settings, editor mode, and interaction state.
- **`useDiagnosticStore`**: FPS, performance history, and debug flags.
- **`useAiStore`**: AI chat history and status.

## 2. Terrain & Simulation Decomposition

### Current Issue
`Terrain.tsx` is 400+ lines long, handling GPU simulation, rendering of multiple meshes (terrain, water, sides), material compilation, and input handling.

### Proposed Solution
Decompose into specialized components:
- **`<WaterSimulation />`**: A headless component that manages the `WaterComputeSystem`, runs the steps in `useFrame`, and performs the read-back.
- **`<TerrainSurface />`**: Specialized in rendering the terrain mesh and its material.
- **`<WaterSurface />`**: Specialized in rendering the water mesh.
- **`<TerrainSides />`**: Renders the north, south, east, and west borders.
- **`<TerrainInteraction />`**: Wraps the rendering components to handle `onPointer` events.

## 3. Modular Shader System

### Current Issue
Shader chunks are imported as strings and manually injected via `onBeforeCompile` in components. This is error-prone and hard to debug.

### Proposed Solution
Create a `ShaderFactory` or a structured registry for shader chunks.
- Standardize the `uTerrainSurface` and `uTerrainLayers` uniform names across all shaders.
- Use a helper to compose materials with standard game features (day/night, height-based coloring).

## 4. TerrainManager & State Sync

### Current Issue
`TerrainManager` is a singleton that holds a duplicate of the `vertices` array. Direct mutations are performed on this array, bypassing Zustand's typical flow, though triggered by `terrainVersion`.

### Proposed Solution
- **Remove the Singleton**: Transform `TerrainManager` into a set of pure utility functions in `src/systems/terrainSystem.ts`.
- **Single Source of Truth**: Vertices should live only in the Zustand store.
- **Performance**: Use `useStore.getState().terrainVertices` for read access in systems. For mutations, use `immer` or similar, or continue with the "versioned mutation" pattern if performance is critical, but document it clearly as a "fast-path" bypass.

## 5. Performance Optimizations

### GPU Readback Throttling
- Currently, `readBack` stalls the GPU every frame.
- **Action**: Implement a throttling mechanism to only read back every N frames or use a circular buffer of pixels to minimize pipeline stalls.

### Entity Logic
- Move simple entity state transitions (IDLE -> MOVING) to a more "data-oriented" approach, potentially using a typed array for positions if entity counts increase.

## 6. Directory Reorganization

Move towards a more domain-driven structure:
- `src/features/terrain/` (Simulation, Rendering, Manager)
- `src/features/entities/` (AI, Movement, Rendering)
- `src/features/economy/` (Resources, Building Logic)
- `src/core/` (Store, Constants, Shaders)
