import express from 'express'
import cors from 'cors'

import metricsRouter from './routes/metrics'

const app = express()
const PORT = Number(process.env.PORT || 4000)

app.use(cors())
app.use(express.json())

app.use('/metrics', metricsRouter)

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Metrics API rodando na porta ${PORT}`)
})
