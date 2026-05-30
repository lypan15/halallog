import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

const shot = async (name) => {
  await page.screenshot({ path: `v-${name}.png`, fullPage: false });
  console.log(`v-${name}.png`);
};

// 1. Day Plan tab - day tabs two-line, quick-add buttons
await page.goto('http://localhost:3000/planner/seou-spring', { waitUntil: 'networkidle' });
await page.click('button:has-text("Day Plan")');
await page.waitForTimeout(400);
await shot('day-plan-tabs');

// 2. Quick-add Prayer Space click
await page.click('button:has-text("Prayer Space")');
await page.waitForTimeout(300);
await shot('quickadd-prayerspace');

// 3. Note quick-add
await page.click('button:has-text("Note")');
await page.waitForTimeout(300);
await shot('quickadd-note');

// 4. Budget - empty state
await page.goto('http://localhost:3000/planner/seou-spring', { waitUntil: 'networkidle' });
await page.click('button:has-text("Budget")');
await page.waitForTimeout(400);
await shot('budget-empty');

// 5. Budget View Stats (add item first)
await page.fill('input[placeholder="Amount ($)"]', '25');
await page.fill('input[placeholder="Day (e.g. 1)"]', '2');
await page.click('button:has-text("+ Add Cost")');
await page.waitForTimeout(300);
await page.click('button:has-text("View Stats")');
await page.waitForTimeout(300);
await shot('budget-stats');

// 6. Summary - single edit button
await page.goto('http://localhost:3000/planner/seou-spring', { waitUntil: 'networkidle' });
await shot('summary-cover');

// 7. Summary edit popup
await page.click('button[aria-label="Edit trip"]');
await page.waitForTimeout(400);
await shot('summary-edit-popup');
await page.keyboard.press('Escape');

// 8. Most Used - stay with checkout visible in timeline
await page.goto('http://localhost:3000/planner/seou-spring', { waitUntil: 'networkidle' });
await page.click('button:has-text("Most Used")');
await page.click('button:has-text("+ Stay")');
await page.waitForTimeout(300);
await page.fill('input[placeholder="Hotel Name"]', 'Tokyo Palace Hotel');
// Fill check-in and check-out dates
const dateInputs = await page.locator('input[type="date"]').all();
if (dateInputs[0]) await dateInputs[0].fill('2026-08-16');
if (dateInputs[1]) await dateInputs[1].fill('2026-08-18');
await page.click('button:has-text("Save")');
await page.waitForTimeout(400);
await page.click('button:has-text("Summary")');
await page.waitForTimeout(400);
await shot('summary-timeline-checkout');

// 9. Eat tab filters
await page.goto('http://localhost:3000/map', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shot('eat-filters');

// 10. Multi-select filters
await page.click('button:has-text("Halal")');
await page.waitForTimeout(200);
await page.click('button:has-text("Vegan")');
await page.waitForTimeout(200);
await shot('eat-filters-selected');

await browser.close();
console.log('All done');
