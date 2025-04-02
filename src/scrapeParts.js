const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

// URLs for part categories to scrape
const urls = [
  'https://www.partselect.com/Refrigerator-Parts.htm',
  'https://www.partselect.com/Refrigerator-Ice-Makers.htm',
  'https://www.partselect.com/Freezer-Parts.htm',
  'https://www.partselect.com/Dishwasher-Parts.htm',
  'https://www.partselect.com/Dishwasher-Pumps.htm'
];

// Functions to mimic human behavior to avoid timeouts on site
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.2739.79',
];

const getRandomUserAgent = () => {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = () => {
  const min = 2000; 
  const max = 5000; 
  const randomMs = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(randomMs);
};

const humanizeMouse = async (page) => {
  const viewport = await page.viewport();
  const x = Math.floor(Math.random() * viewport.width);
  const y = Math.floor(Math.random() * viewport.height);
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.click(x, y);
};

// Classify appliance from URL
const getApplianceFromUrl = (url) => {
  if (url.includes('Refrigerator')) return 'refrigerator';
  if (url.includes('Freezer')) return 'freezer';
  if (url.includes('Dishwasher')) return 'dishwasher';
  return 'unknown';
};

// Classify appliance from name
const getPartTypeFromName = (name) => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('drain pump')) return 'drain pump';
  if (nameLower.includes('ice maker')) return 'ice maker';
  if (nameLower.includes('filter')) return 'filter';
  if (nameLower.includes('gasket')) return 'gasket';
  return 'unknown';
};

// Scrape phone number dynamically 
const scrapePhoneNumber = async (page) => {
  try {
    console.log('Scraping phone number from https://www.partselect.com...');
    await page.setUserAgent(getRandomUserAgent());
    await page.setExtraHTTPHeaders({
      'Referer': 'https://www.google.com/',
    });
    await page.goto('https://www.partselect.com', { waitUntil: 'networkidle2', timeout: 30000 });

    await humanizeMouse(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(1000);

    let phoneNumber = await page.evaluate(() => {
      const element = document.querySelector('div.header__contact__phone.js-desktopPhone');
      return element ? element.textContent.trim() : '';
    });
    console.log(`Phone number (original selector): ${phoneNumber || 'Not found'}`);

    if (!phoneNumber) {
      console.log('Original selector failed. Searching for phone number pattern...');
      const bodyText = await page.evaluate(() => document.body.textContent);
      const phoneRegex = /1-\d{3}-\d{3}-\d{4}/g;
      const matches = bodyText.match(phoneRegex);
      phoneNumber = matches ? matches[0] : null;
      console.log(`Phone number (pattern search): ${phoneNumber || 'Not found'}`);
    }

    return phoneNumber || '1-888-738-4871'; 
  } catch (error) {
    console.error('Error scraping phone number:', error.message);
    return '1-888-738-4871'; 
  }
};

async function scrapeParts() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-webgl',
      '--disable-features=site-per-process',
      '--window-size=1920,1080',
    ],
  });
  const partData = {};

  // Create a single page; avoid cookies and session
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Scrape phone number first; establishes the session
  const supportPhoneNumber = await scrapePhoneNumber(page);
  console.log(`Using support phone number: ${supportPhoneNumber}`);

  for (const url of urls) {
    try {
      console.log(`Fetching ${url}...`);
      await page.setUserAgent(getRandomUserAgent());
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://www.partselect.com/',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
      });

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      await humanizeMouse(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await delay(1000);

      const content = await page.content();
      console.log(`Fetched ${url}, content length: ${content.length} bytes`);

      await page.waitForSelector('.nf__part', { timeout: 10000 });

      const appliance = getApplianceFromUrl(url);

      const parts = await page.evaluate(() => {
        const partElements = document.querySelectorAll('.nf__part');
        const partsData = [];
        
        partElements.forEach(element => {
          // Extract part details
          // URL
          const partLink = element.querySelector('a[href*="/PS"]')?.getAttribute('href') || '';
          const partUrl = partLink.startsWith('http') ? partLink : `https://www.partselect.com${partLink}`;

          // Name
          const name = element.querySelector('.nf__part__detail__title span')?.textContent.trim() || '';
          
          // Part number
          const partNumberRaw = element.querySelector('.nf__part__detail__part-number strong')?.textContent.trim() || '';
          const partNumber = partNumberRaw || '';
          
          // Manufacturer Part
          let manufacturerPartNumber = 'N/A';
          const partNumberDivs = element.querySelectorAll('.nf__part__detail__part-number');
          partNumberDivs.forEach(div => {
            if (div.textContent.includes('Manufacturer Part Number')) {
              manufacturerPartNumber = div.querySelector('strong')?.textContent.trim() || 'N/A';
            }
          });

          // Price
          let price = element.querySelector('.price:not(.original-price)')?.textContent.trim() || '';
          price = price.replace(/\s+/g, ' ').replace(/[^\d.$]/g, '');

          // Image
          let image = element.querySelector('.nf__part__left-col__img img')?.getAttribute('src') || '';
          if (!image || image.includes('base64')) {
            image = element.querySelector('.nf__part__left-col__img img')?.getAttribute('data-src') || 'https://via.placeholder.com/80';
          }
          image = image.startsWith('http') ? image : `https://www.partselect.com${image}`;

          // Rating
          const ratingElement = element.querySelector('.rating__stars__upper');
          let starRating = ratingElement ? ratingElement.style.width || '0%' : '0%';

          // Reviews
          const reviewsElement = element.querySelector('span[class*="rating__count"]');
          const reviewsText = reviewsElement ? reviewsElement.innerText.trim() : '0 Reviews';
          const numberOfReviews = parseInt(reviewsText.replace(' Reviews', '')) || 0;

          if (numberOfReviews === 0) {
            starRating = '0%';
          }

          // Description
          const detailElement = element.querySelector('.nf__part__detail');
          let description = 'No description available';
          if (detailElement) {
            const allText = detailElement.innerText.trim();

            const titleText = element.querySelector('.nf__part__detail__title')?.innerText.trim() || '';
            const partNumberText = element.querySelector('.nf__part__detail__part-number')?.innerText.trim() || '';
            const manufacturerText = Array.from(partNumberDivs).find(div => div.textContent.includes('Manufacturer Part Number'))?.innerText.trim() || '';
            const symptomsText = element.querySelector('.nf__part__detail__symptoms')?.innerText.trim() || '';
            const instructionsText = element.querySelector('.nf__part__detail__instruction')?.innerText.trim() || '';
            const ratingText = element.querySelector('.nf__part__detail__rating')?.innerText.trim() || '';

            const excludeTexts = [
              titleText,
              partNumberText,
              manufacturerText,
              symptomsText,
              instructionsText,
              ratingText
            ].filter(text => text).join('\n');

            let descText = allText;
            excludeTexts.split('\n').forEach(text => {
              descText = descText.replace(text, '').trim();
            });

            description = descText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
            if (!description || description === '') {
              description = 'No description available';
            }
          }

          partsData.push({
            partLink,
            name,
            partNumber,
            manufacturerPartNumber,
            price,
            image,
            starRating,
            description,
            numberOfReviews
          });
        });

        return partsData;
      });

      parts.forEach(part => {
        const partType = getPartTypeFromName(part.name);
        const partUrl = part.partLink.startsWith('http') ? part.partLink : `https://www.partselect.com${part.partLink}`;
        console.log(`Scraped part URL: ${partUrl}`);

        if (part.name && part.partNumber && !partData[part.partNumber]) {
          partData[part.partNumber] = {
            partNumber: part.partNumber,
            name: part.name,
            price: part.price || 'Price not listed',
            image: part.image,
            manufacturerPartNumber: part.manufacturerPartNumber,
            partType,
            appliance,
            partUrl: partUrl || '',
            starRating: part.starRating,
            description: part.description,
            numberOfReviews: part.numberOfReviews
          };
          console.log(`Added part: ${part.partNumber} with URL: ${partUrl}`);
        }
      });

      if (Object.keys(partData).length === 0) {
        console.warn(`No parts found on ${url}. Check selectors or page content.`);
      }

      await randomDelay(); 
    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      console.log(`Skipping ${url} due to error and continuing with the next URL...`);
    }
  }

  // Append support number to partData.json
  partData["Support Phone Number"] = supportPhoneNumber;

  if (Object.keys(partData).length > 0) {
    console.log('Writing partData.json...');
    fs.writeFileSync('partData.json', JSON.stringify(partData, null, 2), 'utf8');
    console.log(`Part data saved to partData.json with ${Object.keys(partData).length - 1} unique parts and support phone number`);
  } else {
    console.log('No data scraped. partData.json not updated.');
  }

  await page.close();
  await browser.close();
}

// For use in server.js
module.exports = { scrapeParts };

// For direct use
if (require.main === module) {
  console.log('Running scrapeParts directly...');
  scrapeParts().catch(error => {
    console.error('Error running scrapeParts:', error.message);
    process.exit(1);
  });
}