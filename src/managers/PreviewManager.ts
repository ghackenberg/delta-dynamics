import type { TerrainData } from '../types/game'

export type PreviewJob = {
  id: string
  terrainData?: TerrainData
  resolve: (url: string) => void
  reject: (err: Error) => void
}

class PreviewManager {
  private worker: Worker | null = null
  private queue: PreviewJob[] = []
  private activeJobs = new Map<number, PreviewJob>()
  private nextJobId = 0
  private cache = new Map<string, string>()

  constructor() {
    if (typeof window !== 'undefined') {
      // Use Vite's worker constructor
      this.worker = new Worker(new URL('../workers/terrainPreview.worker.ts', import.meta.url), { type: 'module' })
      this.worker.onmessage = this.handleMessage.bind(this)
      this.worker.onerror = (e) => console.error('Preview Worker Error:', e)
    }
  }

  private handleMessage(e: MessageEvent) {
    const { jobId, preview, error } = e.data
    const job = this.activeJobs.get(jobId)
    if (!job) return

    this.activeJobs.delete(jobId)
    if (error) {
      job.reject(new Error(error))
    } else {
      this.cache.set(job.id, preview)
      job.resolve(preview)
    }

    this.processQueue()
  }

  private processQueue() {
    if (!this.worker || this.queue.length === 0 || this.activeJobs.size >= 2) return

    const job = this.queue.shift()!
    const jobId = this.nextJobId++
    this.activeJobs.set(jobId, job)
    
    // Send message to worker. If terrainData is provided, it's used directly.
    // Otherwise, the worker uses the ID to find a standard terrain.
    this.worker.postMessage({ 
      id: job.id, 
      jobId, 
      terrainData: job.terrainData 
    })
  }

  /**
   * Gets a preview image for a terrain. 
   * @param id The terrain ID
   * @param terrainData Optional terrain data (required for custom terrains if not cached)
   */
  async getPreview(id: string, terrainData?: TerrainData): Promise<string> {
    if (this.cache.has(id)) return this.cache.get(id)!

    return new Promise((resolve, reject) => {
      this.queue.push({ id, terrainData, resolve, reject })
      this.processQueue()
    })
  }

  /**
   * Clears the cache for a specific terrain ID.
   */
  clearCache(id: string) {
    this.cache.delete(id)
  }
}

export const previewManager = new PreviewManager()
