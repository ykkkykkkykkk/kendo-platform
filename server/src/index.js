import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import teamsRouter       from './routes/teams.js';
import playersRouter     from './routes/players.js';
import tournamentsRouter from './routes/tournaments.js';

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/teams',       teamsRouter);
app.use('/api/players',     playersRouter);
app.use('/api/tournaments', tournamentsRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`server running on http://localhost:${PORT}`));
