import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const quizSpec = {
  baselineScreenshotPath: path.join(__dirname, '..', 'baselines', 'quiz_baseline.png'),

  rubric: { html: 30, css: 25, js: 30, visual: 15 },

  domTests: [
    { name: '.title div exists',          selector: '.title',                          weight: 5  },
    { name: 'h1 contains text "Quizz"',   selector: 'h1',    textContains: 'Quizz',   weight: 10 },
    { name: 'div.box exists',             selector: 'div.box',                         weight: 5  },
    { name: '#question exists',           selector: '#question',                       weight: 15 },
    { name: '#myForm exists',             selector: '#myForm',                         weight: 10 },
    { name: 'radio input value="a"',      selector: 'input[type="radio"][value="a"]',  weight: 5  },
    { name: 'radio input value="b"',      selector: 'input[type="radio"][value="b"]',  weight: 5  },
    { name: 'radio input value="c"',      selector: 'input[type="radio"][value="c"]',  weight: 5  },
    { name: 'radio input value="d"',      selector: 'input[type="radio"][value="d"]',  weight: 5  },
    { name: '#submit button exists',      selector: '#submit',                         weight: 10 },
    { name: '#a_text span exists',        selector: '#a_text',                         weight: 5  },
    { name: '#b_text span exists',        selector: '#b_text',                         weight: 5  },
    { name: '#c_text span exists',        selector: '#c_text',                         weight: 5  },
    { name: '#d_text span exists',        selector: '#d_text',                         weight: 5  }
  ],

  styleTests: [
    {
      name: 'body has display:flex',
      selector: 'body',
      property: 'display',
      check: (v) => v.trim() === 'flex',
      weight: 20
    },
    {
      name: '.box has border-radius > 0',
      selector: '.box',
      property: 'border-radius',
      check: (v) => parseFloat(v) > 0,
      weight: 20
    },
    {
      name: '#submit has blue-ish background',
      selector: '#submit',
      property: 'background-color',
      check: (v) => {
        const m = v.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!m) return false;
        const [, r, g, b] = m.map(Number);
        return b > 100 && b > r && b > g;
      },
      weight: 20
    },
    {
      name: 'body min-height is 100vh',
      selector: 'body',
      property: 'min-height',
      check: (v) => {
        // At 720px viewport height, 100vh = 720px
        const px = parseFloat(v);
        return v.includes('100vh') || px >= 700;
      },
      weight: 20
    },
    {
      name: '.box has max-width set',
      selector: '.box',
      property: 'max-width',
      check: (v) => v !== 'none' && v !== '' && v !== '0px',
      weight: 20
    }
  ],

  interactionTests: [
    {
      name: 'Submit without selection triggers validation',
      weight: 30,
      run: async (page) => {
        await page.click('#submit');
        await new Promise(r => setTimeout(r, 500));
        // Check if alert was intercepted
        const alertCalled = await page.evaluate(() => window._alertCalled);
        if (alertCalled) return true;
        // Fallback: any validation text visible in body
        const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
        return bodyText.includes('select') || bodyText.includes('choose') || bodyText.includes('please');
      }
    },
    {
      name: 'Selecting answer and submitting advances question',
      weight: 40,
      run: async (page) => {
        const initialText = await page.$eval('#question', el => el.textContent.trim());
        await page.click('input[type="radio"][value="a"]');
        await page.click('#submit');
        await new Promise(r => setTimeout(r, 500));
        const newText = await page.$eval('#question', el => el.textContent.trim());
        return newText !== initialText;
      }
    },
    {
      name: 'After completing quiz a score/result appears',
      weight: 30,
      run: async (page) => {
        for (let i = 0; i < 11; i++) {
          try {
            const radio = await page.$('input[type="radio"][value="a"]');
            if (!radio) break;
            await page.click('input[type="radio"][value="a"]');
            await page.click('#submit');
            await new Promise(r => setTimeout(r, 300));
          } catch {
            break;
          }
        }
        const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
        return (
          bodyText.includes('score') ||
          bodyText.includes('result') ||
          bodyText.includes('complete') ||
          bodyText.includes('out of') ||
          bodyText.includes('you got')
        );
      }
    }
  ]
};
