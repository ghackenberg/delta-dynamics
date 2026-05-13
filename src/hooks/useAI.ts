import { useState } from 'react'
import { CreateMLCEngine, MLCEngine, type ChatCompletionMessageParam } from '@mlc-ai/web-llm'
import { useStore } from './useStore'

export const useAI = () => {
  const [engine, setEngine] = useState<MLCEngine | null>(null)
  const setAiStatus = useStore((state) => state.setAiStatus)
  const setAiLoading = useStore((state) => state.setAiLoading)
  const setAiResponse = useStore((state) => state.setAiResponse)
  const resources = useStore((state) => state.resources)
  const rates = useStore((state) => state.rates)

  const consultAdvisor = async () => {
    if (!engine) return
    
    try {
      setAiLoading(true)
      setAiStatus('Consulting Advisor...')
      
      const gameState = {
        resources,
        rates,
        message: "The player is asking for advice on their current settlement status."
      }

      const messages: ChatCompletionMessageParam[] = [
        { 
          role: "system", 
          content: "You are the Steward AI, a wise advisor for a settlement leader. Analyze the provided game state (resources and production rates) and give brief, strategic advice (max 2 sentences). Be atmospheric but helpful." 
        },
        { 
          role: "user", 
          content: `Current State: ${JSON.stringify(gameState)}` 
        },
      ]
      
      const chunks = await engine.chat.completions.create({
        messages: messages,
        stream: true,
      })

      let fullResponse = ""
      setAiResponse("")
      for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta?.content || ""
        fullResponse += content
        setAiResponse(fullResponse)
      }
      
      setAiStatus('AI Ready')
    } catch (error) {
      console.error('Advisor consultation failed:', error)
      setAiStatus('AI Error')
    } finally {
      setAiLoading(false)
    }
  }

  const initAI = async () => {
    try {
      setAiLoading(true)
      setAiStatus('Initializing WebGPU...')
      
      const selectedModel = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
      
      const engine = await CreateMLCEngine(selectedModel, {
        initProgressCallback: (progress) => {
          setAiStatus(`Loading model: ${Math.round(progress.progress * 100)}%`)
        }
      })
      
      setEngine(engine)
      setAiStatus('AI Ready')
    } catch (error) {
      console.error('Failed to init AI:', error)
      setAiStatus('AI Initialization Failed')
    } finally {
      setAiLoading(false)
    }
  }

  return { engine, initAI, consultAdvisor }
}
