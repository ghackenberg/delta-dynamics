# Refactoring Proposal - Delta Dynamics

This document outlines the proposed architectural changes to improve maintainability, performance, and scalability of the game engine.

## 1. State Management (Zustand Splitting) (COMPLETED)

### Current Issue
`useStore.ts` is a "God Object" managing 30+ state variables and containing complex logic for building placement, terrain painting, and the main game tick. This makes it hard to test and maintain.

### Solution Applied
Split the store into functional slices:
- **`src/stores/game.ts`**: Core game logic, resources, entities, and terrain.
- **`src/stores/editor.ts`**: Brush settings and editor mode.
- **`src/stores/ui.ts`**: HUD and menu states.
- **`src/stores/ai.ts`**: AI chat history and status.

## 2. Terrain & Simulation Decomposition (COMPLETED)

### Current Issue
`Terrain.tsx` was handling too many responsibilities (GPU simulation, rendering of multiple meshes, material compilation).

### Solution Applied
Decomposed into specialized components in `src/components/scene/terrain/`:
- **`<WaterSimulation />`**: Manages `WaterComputeSystem` and GPU read-back.
- **`<TerrainSurface />`**: Renders terrain mesh.
- **`<WaterSurface />`**: Renders water mesh.
- **`<TerrainSides />`**: Renders terrain borders.
- **`<WaterSides />`**: Renders water borders.

## 3. Modular Shader System

### Current Issue
Shader chunks are imported as strings and manually injected via `onBeforeCompile` in components. This is error-prone and hard to debug.

### Proposed Solution
Create a `ShaderFactory` or a structured registry for shader chunks.
- Standardize the `uTerrainSurface` and `uTerrainLayers` uniform names across all shaders.
- Use a helper to compose materials with standard game features (day/night, height-based coloring).

## 4. TerrainManager & State Sync (COMPLETED)

### Current Issue
`TerrainManager` was a singleton that held a duplicate of the `vertices` array. Direct mutations were performed on this array, bypassing Zustand's typical flow.

### Solution Applied
- **Removed the Singleton**: Transformed `TerrainManager` into a set of pure utility functions in `src/systems/terrainSystem.ts`.
- **Single Source of Truth**: Vertices now live only in the Zustand store (`terrainVertices`).
- **Performance**: Systems now use `useStore.getState().terrainVertices` for read access and pure functions for mutations, maintaining the "versioned mutation" pattern for performance.

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
