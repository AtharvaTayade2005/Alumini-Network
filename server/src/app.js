import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import config from './config/env.js'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

if (config.env !== 'test') {
  app.use(morgan('dev'))
}

app.use('/api', routes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
