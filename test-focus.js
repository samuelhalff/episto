const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    
    console.log('Navigating to http://localhost:3000/en-CH');
    await page.goto('http://localhost:3000/en-CH', { waitUntil: 'networkidle2', timeout: 15000 });
    console.log('Page loaded');
    
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
    
    // Try direct navigation instead
    console.log('Attempting to navigate directly to draft');
    await page.goto('http://localhost:3000/en-CH/draft', { waitUntil: 'networkidle2', timeout: 15000 });
    console.log('Draft page loaded');
    
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
    await page.screenshot({ path: '/home/sam/dev/swiss-mail/test-results/scroll-fix-1-workspace.png' });
    console.log('Screenshot 1 taken: workspace');
    
    const textarea = await page.$('textarea');
    console.log('Textarea found:', !!textarea);
    
    if (textarea) {
      await textarea.click();
      console.log('Textarea clicked');
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
      await page.screenshot({ path: '/home/sam/dev/swiss-mail/test-results/scroll-fix-2-after-focus.png' });
      console.log('Screenshot 2 taken: after focus');
      
      // Simulate mobile keyboard
      await page.setViewport({ width: 390, height: 400, deviceScaleFactor: 2 });
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
      await page.screenshot({ path: '/home/sam/dev/swiss-mail/test-results/scroll-fix-3-keyboard.png' });
      console.log('Screenshot 3 taken: keyboard');
      
      const info = await page.evaluate(() => ({
        html: document.documentElement.scrollTop,
        body: document.body.scrollTop,
        root: document.getElementById('draft-workspace-root')?.scrollTop ?? -1,
      }));
      console.log('SCROLL POSITIONS:', JSON.stringify(info));
      
      // Type something and check stability
      await page.keyboard.type('Hello test');
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 300)));
      await page.screenshot({ path: '/home/sam/dev/swiss-mail/test-results/scroll-fix-4-typing.png' });
      console.log('Screenshot 4 taken: typing');
      
      const info2 = await page.evaluate(() => ({
        html: document.documentElement.scrollTop,
        body: document.body.scrollTop,
        root: document.getElementById('draft-workspace-root')?.scrollTop ?? -1,
      }));
      console.log('SCROLL AFTER TYPING:', JSON.stringify(info2));
    } else {
      console.log('NO TEXTAREA FOUND - rate limit may be blocking');
    }
    
    await browser.close();
    console.log('Done');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
