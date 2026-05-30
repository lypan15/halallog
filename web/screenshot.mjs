import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

const shots = [
  ['http://localhost:3000/planner/new', 'shot-new-step1.png'],
  ['http://localhost:3000/planner/seou-spring', 'shot-summary.png'],
];

for (const [url, file] of shots) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: file, fullPage: true });
  console.log('Saved', file);
}

// Most Used tab
await page.goto('http://localhost:3000/planner/seou-spring', { waitUntil: 'networkidle', timeout: 15000 });
await page.click('button:has-text("Most Used")');
await page.waitForTimeout(400);
await page.screenshot({ path: 'shot-essential.png', fullPage: true });
console.log('Saved shot-essential.png');

// Click + Flight
await page.click('button:has-text("+ Flight")');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shot-flight-form.png', fullPage: true });
console.log('Saved shot-flight-form.png');

// Day Plan tab
await page.goto('http://localhost:3000/planner/seou-spring', { waitUntil: 'networkidle', timeout: 15000 });
await page.click('button:has-text("Day Plan")');
await page.waitForTimeout(400);
await page.screenshot({ path: 'shot-day-plan.png', fullPage: true });
console.log('Saved shot-day-plan.png');

// FAB click
await page.click('button:has-text("+")');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shot-fab.png', fullPage: true });
console.log('Saved shot-fab.png');

// Budget tab
await page.goto('http://localhost:3000/planner/seou-spring', { waitUntil: 'networkidle', timeout: 15000 });
await page.click('button:has-text("Budget")');
await page.waitForTimeout(400);
await page.screenshot({ path: 'shot-budget.png', fullPage: true });
console.log('Saved shot-budget.png');

// New trip step 3
await page.goto('http://localhost:3000/planner/new', { waitUntil: 'networkidle', timeout: 15000 });
await page.click('button:has-text("Next")'); // step 1 → 2
await page.waitForTimeout(300);
await page.click('button:has-text("Next")'); // step 2 → 3
await page.waitForTimeout(300);
await page.screenshot({ path: 'shot-new-step3.png', fullPage: true });
console.log('Saved shot-new-step3.png');

await browser.close();
console.log('All screenshots done');
