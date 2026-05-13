# Delta Dynamics - Development Guidelines

## Mandates

- **Validation:** You MUST run `npm run build` and `npm run lint` and ensure both pass without errors or warnings before committing any changes.
- **Performance:** Direct property mutations on stable Three.js objects (e.g., textures, uniforms) inside the `useFrame` loop are permitted for performance. Use `/* eslint-disable react-hooks/immutability */` at the file level or target specific lines if the linter flags these necessary optimizations.
- **State Management:** All global game state must reside in `src/hooks/useStore.ts` using Zustand.
