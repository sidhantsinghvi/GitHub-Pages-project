import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.post('/api/claude', async (req, res) => {
  const { messages, system, apiKey } = req.body

  const key = process.env.ANTHROPIC_API_KEY || apiKey
  if (!key) {
    return res.status(401).json({ error: 'No API key provided' })
  }

  try {
    const client = new Anthropic({ apiKey: key })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system,
      messages,
    })

    const text = response.content.find((b) => b.type === 'text')?.text ?? ''
    res.json({ text })
  } catch (err) {
    console.error('Claude API error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`ArchAI API server running on http://localhost:${PORT}`)
})
