const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const { scrapeParts } = require('./src/scrapeParts'); 

// Scrape data every 24 hours
let cachedPartData = null;
let lastScraped = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const app = express();
const PORT = 5000;

// CORS for requests from React app
app.use(cors());

app.use(express.static('.', {
  setHeaders: (res, path) => {
    if (path.endsWith('partData.json')) {
      res.set('Cache-Control', 'no-store'); 
    }
  }
}));

// Data scraping
app.get('/scrape-and-get-data', async (req, res) => {
  try {
    if (!cachedPartData || Date.now() - lastScraped > CACHE_DURATION) {
      console.log('Scraping data...');
      await scrapeParts();
      console.log('Scraping complete. Reading partData.json...');
      const partData = await fs.readFile('partData.json', 'utf8');
      cachedPartData = JSON.parse(partData);
      lastScraped = Date.now();
    } else {
      console.log('Serving cached partData...');
    }
    res.set('Cache-Control', 'no-store');
    res.json(cachedPartData);
  } catch (error) {
    console.error('Error during scraping:', error.message);
    try {
      const partData = await fs.readFile('partData.json', 'utf8');
      res.set('Cache-Control', 'no-store');
      res.json(JSON.parse(partData));
    } catch (fallbackError) {
      console.error('Error reading fallback partData.json:', fallbackError.message);
      res.status(500).json({ error: 'Failed to scrape or read part data' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});