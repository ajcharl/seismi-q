require('dotenv').config();
const express = require('express');
const cors = require('cors');
const earthquakeRoutes = require('./routes/earthquakes');
const alertRoutes = require('./routes/alerts');
const { fetchFeed } = require('./services/usgs');
const { formatFeed } = require('./services/formatters');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/earthquakes', earthquakeRoutes);
app.use('/api/alerts', alertRoutes);

// --- SSE: Real-time earthquake stream ---
const sseClients = new Set();
let lastQuakeIds = new Set();
let lastPollTime = null;

// Poll USGS every 30 seconds and push new events to SSE clients
async function pollAndBroadcast() {
  try {
    const raw = await fetchFeed('all_hour');
    const feed = formatFeed(raw);
    lastPollTime = Date.now();

    const currentIds = new Set(feed.quakes.map(q => q.id));
    const newQuakes = feed.quakes.filter(q => !lastQuakeIds.has(q.id));

    // On first poll, don't treat everything as "new"
    if (lastQuakeIds.size > 0 && newQuakes.length > 0) {
      const event = JSON.stringify({
        type: 'new_quakes',
        quakes: newQuakes,
        stats: feed.stats,
        timestamp: lastPollTime,
      });
      for (const client of sseClients) {
        client.write(`data: ${event}\n\n`);
      }
    }

    // Always send a heartbeat with current stats
    const heartbeat = JSON.stringify({
      type: 'heartbeat',
      stats: feed.stats,
      count: feed.quakes.length,
      timestamp: lastPollTime,
    });
    for (const client of sseClients) {
      client.write(`data: ${heartbeat}\n\n`);
    }

    lastQuakeIds = currentIds;
  } catch (err) {
    console.error('SSE poll error:', err.message);
  }
}

setInterval(pollAndBroadcast, 30000);
pollAndBroadcast();

app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), sseClients: sseClients.size, lastPoll: lastPollTime });
});

app.listen(PORT, () => {
  console.log(`SeismiQ API running on port ${PORT}`);
});
