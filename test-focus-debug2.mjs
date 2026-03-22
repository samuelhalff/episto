import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Listen to console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });
    
    page.on('error', err => {
      console.log('PAGE ERROR:', err);
    });
    
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    
    console.log('Navigating to http://localhost:3000/en-CH/draft');
    const response = await page.goto('http://localhost:3000/en-CH/draft', { waitUntil: 'networkidle2', timeout: 15000 });
    console.log('Response status:', response?.status());
    
    // Wait longer for JavaScript to load
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
    
    // Try to find the element by multiple selectors
    const elements = await page.evaluate(() => {
      const selectors = [
        'textarea',
        'input[type="text"]',
        '.editor',
        '[contenteditable]',
        '[role="textbox"]',
        '#workspace-input',
        '#draft-editor'
      ];
      
      const results = {};
      for (const selector of selectors) {
        const els = document.querySelectorAll(selector);
        results[selector] = {
          count: els.length,
          visible: Array.from(els).filter(e => e.offsetHeight > 0).length,
          elements: Array.from(els).map(e => ({
            id: e.id,
            class: e.className,
            tagName: e.tagName,
            visible: e.offsetHeight > 0,
            innerText: (e.innerText || e.textContent || '').slice(0, 50)
          }))
        };
      }
      
      return {
        elementCounts: results,
        bodyClasses: document.body.className,
        title: document.title
      };
    });
    
    console.log('Elements found:', JSON.stringify(elements, null, 2));
    
    // Get scroll position info
    const scrollInfo = await page.evaluate(() => {
      return {
        windowHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        bodyHeight: document.body.scrollHeight,
        rootElement: document.getElementById('__next') ? 'has __next' : 'no __next',
        rootChildren: document.getElementById('__next')?.children.length ?? 0
      };
    });
    
    console.log('Scroll info:', JSON.stringify(scrollInfo, null, 2));
    
    await browser.close();
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
