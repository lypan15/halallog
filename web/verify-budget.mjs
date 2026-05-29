import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

// Budget 탭 열기
await page.goto('http://localhost:3000/planner/seou-spring', { waitUntil: 'networkidle' });
await page.click('button:has-text("Budget")');
await page.waitForTimeout(600);

// 1. 빈 상태 (legacy data 사라졌는지)
await page.screenshot({ path: 'vb-empty.png' });
console.log('vb-empty.png — should show $0 and no items');

// 2. 통화 드롭다운 + Day 드롭다운 확인
// currency 선택 후 클릭해서 옵션 보이게
await page.screenshot({ path: 'vb-form.png' });
console.log('vb-form.png — form with currency + day dropdowns');

// 3. KRW 선택 후 25000 입력, Day 1 선택 후 Add
await page.selectOption('select:has(option[value="KRW"])', 'KRW');
await page.fill('input[placeholder="Amount"]', '25000');
await page.selectOption('select:has(option[value="Day 1"])', 'Day 1');
await page.waitForTimeout(200);
await page.screenshot({ path: 'vb-before-add.png' });
console.log('vb-before-add.png — KRW 25000 Day 1 filled in');

await page.click('button:has-text("+ Add Cost")');
await page.waitForTimeout(400);
await page.screenshot({ path: 'vb-after-add.png' });
console.log('vb-after-add.png — item added, total shows ₩');

await browser.close();
console.log('Done');
