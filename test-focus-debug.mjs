import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    
    console.log('Navigating to http://localhost:3000/en-CH/draft');
    await page.goto('http://localhost:3000/en-CH/draft', { waitUntil: 'networkidle2', timeout: 15000 });
    console.log('Draft page loaded');
    
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
    
    // Get all textareas and inputs
    const textInputs = await page.evaluate(() => {
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
      
      return {
        textareaCount: textareas.length,
        textareas: textareas.map((ta, i) => ({ 
          index: i, 
          id: ta.id, 
          class: ta.className, 
          placeholder: ta.placeholder,
          visible: ta.offsetHeight > 0
        })),
        inputCount: inputs.length,
        inputs: inputs.map((inp, i) => ({
          index: i,
          id: inp.id,
          class: inp.className,
          placeholder: inp.placeholder,
          type: inp.type,
          visible: inp.offsetHeight > 0
        })),
        bodyContent: document.body.innerHTML.slice(0, 500)
      };
    });
    
    console.log('Page structure:', JSON.stringify(textInputs, null, 2));
    
    await browser.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
