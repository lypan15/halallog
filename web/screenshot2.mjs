import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

// 1. Budget → View Stats
await page.goto('http://localhost:3000/planner/seou-spring', { waitUntil: 'networkidle' });
await page.click('button:has-text("Budget")');
await page.waitForTimeout(400);
await page.click('button:has-text("View Stats")');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shot-stats.png', fullPage: true });
console.log('shot-stats.png saved');

// 2. Essential Info → Save a flight → check Add Another Flight button
await page.goto('http://localhost:3000/planner/seou-spring', { waitUntil: 'networkidle' });
await page.click('button:has-text("Essential Info")');
await page.click('button:has-text("+ Flight")');
await page.waitForTimeout(200);
// Fill form fields
await page.locator('input[placeholder="ICN"]').fill('ICN');
await page.locator('input[placeholder="NRT"]').fill('NRT');
await page.locator('input[placeholder="Korean Air"]').fill('Korean Air');
await page.locator('input[placeholder="KE703"]').fill('KE703');
await page.click('button:has-text("Save")');
await page.waitForTimeout(400);
await page.screenshot({ path: 'shot-flight-saved.png', fullPage: true });
console.log('shot-flight-saved.png saved');

// 3. Summary → check timeline appears after adding flight
await page.click('button:has-text("Summary")');
await page.waitForTimeout(400);
await page.screenshot({ path: 'shot-summary-with-flight.png', fullPage: true });
console.log('shot-summary-with-flight.png saved');

await browser.close();
console.log('Done');
