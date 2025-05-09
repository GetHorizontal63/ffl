const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const initDraftSocket = require('./services/draftSocketService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

// Define your routes here
// app.use('/api', apiRoutes);

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket service
initDraftSocket(server);

// Listen on server instead of app
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});