import type { TerrainConfig, TerrainData } from '../types/game';

const DB_NAME = 'DeltaDynamics';
const STORE_NAME = 'terrains';
const DB_VERSION = 1;

export interface StoredTerrain {
  id: string;
  name: string;
  category: 'CUSTOM';
  lastModified: number;
  visualRange: [number, number];
  terrainData: TerrainData;
}

class StorageManager {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async saveTerrain(terrain: StoredTerrain): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(terrain);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCustomTerrains(): Promise<TerrainConfig[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result as StoredTerrain[];
        const configs: TerrainConfig[] = results.map((stored) => ({
          id: stored.id,
          name: stored.name,
          category: 'CUSTOM',
          lastModified: stored.lastModified,
          visualRange: stored.visualRange,
          generate: () => structuredClone(stored.terrainData), // Correctly clones typed arrays
        }));
        resolve(configs);
      };
    });
  }

  async getTerrainData(id: string): Promise<TerrainData | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as StoredTerrain;
        resolve(result ? result.terrainData : null);
      };
    });
  }

  async duplicateTerrain(source: TerrainConfig, newName?: string): Promise<string> {
    const sourceData = source.generate();
    const newId = `custom-${Date.now()}`;
    const name = newName || `${source.name} (Copy)`;
    
    const stored: StoredTerrain = {
      id: newId,
      name: name,
      category: 'CUSTOM',
      lastModified: Date.now(),
      visualRange: source.visualRange,
      terrainData: sourceData,
    };

    await this.saveTerrain(stored);
    return newId;
  }

  async renameTerrain(id: string, newName: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const terrain = getRequest.result as StoredTerrain;
        if (!terrain) {
          reject(new Error(`Terrain with id ${id} not found`));
          return;
        }

        terrain.name = newName;
        terrain.lastModified = Date.now();

        const updateRequest = store.put(terrain);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve();
      };
    });
  }

  async deleteTerrain(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const storageManager = new StorageManager();
