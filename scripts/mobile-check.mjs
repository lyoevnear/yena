import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= resolve('.qa/browsers');
const { chromium, webkit } = await import('../.qa/node_modules/playwright/index.mjs');
await mkdir('test-results', { recursive: true });
const sizes = [[320,568],[360,740],[375,667],[390,844],[412,915],[430,932],[600,900],[768,1024],[820,1180],[960,800],[844,390],[667,375]];

for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()}: ${response.url()}`); });
  await page.goto('http://localhost:3000');
  await page.evaluate(() => document.fonts.ready);

  async function noOverflow(stage) {
    const result = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
    assert.ok(result.content <= result.width + 1, `${name} ${stage}: ${result.content} > ${result.width}`);
  }
  async function controlsVisible() {
    await page.waitForFunction(() => {
      const bar = document.getElementById('mobile-controls');
      return getComputedStyle(bar).display !== 'none' && !bar.hidden;
    });
    const bar = await page.locator('#mobile-controls').boundingBox();
    const height = page.viewportSize().height;
    assert.ok(bar && bar.y >= 0 && bar.y + bar.height <= height + 1, `${name} controls must stay in viewport`);
  }
  async function tapNext() {
    await page.locator('#mobile-controls [data-action="next"]').tap();
  }

  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await noOverflow(`home ${width}x${height}`);
    const button = await page.locator('[data-action="start"]').boundingBox();
    assert.ok(button.height >= 56);
    if (width === 375 || width === 390) assert.ok(button.y + button.height <= height, 'Start button fits on a typical portrait screen');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `test-results/mobile-${name}-home.png`, fullPage: true });
  await page.getByRole('button', { name: '게임 안내 열기' }).tap();
  await page.setViewportSize({ width: 667, height: 375 });
  const dialog = await page.locator('#help-dialog').boundingBox();
  assert.ok(dialog.height <= 375 - 30, 'Dialog must fit within landscape viewport');
  await page.getByRole('button', { name: '안내 닫기' }).tap();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-action="start"]').tap();
  await controlsVisible();
  assert.ok(await page.locator('#mobile-controls [data-action="next"]').isDisabled());
  await page.locator('label[for="choice-0"]').scrollIntoViewIfNeeded();
  await page.locator('label[for="choice-0"]').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.evaluate(() => { window.originalFieldset = document.querySelector('fieldset'); });
  const beforeScroll = await page.evaluate(() => scrollY);
  await page.locator('label[for="choice-0"]').tap();
  assert.ok(await page.evaluate(() => window.originalFieldset === document.querySelector('fieldset')), 'Choice selection must preserve DOM');
  assert.ok(Math.abs((await page.evaluate(() => scrollY)) - beforeScroll) <= 2, 'Choice selection must preserve scroll');
  await controlsVisible();
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await noOverflow(`story ${width}x${height}`);
    await controlsVisible();
    assert.ok(await page.locator('.choice').first().evaluate(el => el.getBoundingClientRect().height >= 64));
    assert.ok(await page.locator('.story-copy p').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 17));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('label[for="choice-3"]').scrollIntoViewIfNeeded();
  await page.locator('label[for="choice-3"]').tap();
  assert.equal(await page.locator('#custom-answer').evaluate(el => document.activeElement === el), true);
  assert.equal(await page.locator('#mobile-controls').isVisible(), false, 'Hide controls while typing');
  await page.locator('#custom-answer').fill('내 마음은 말이야. '.repeat(20));
  await page.setViewportSize({ width: 390, height: 400 });
  await page.waitForTimeout(100);
  await noOverflow('keyboard-sized viewport');
  const input = await page.locator('#custom-answer').boundingBox();
  assert.ok(input.height <= 200, 'Input must fit the smaller viewport');
  assert.ok(input.y + input.height <= 400 + 2, 'Input must stay above keyboard-sized viewport bottom');
  await page.screenshot({ path: `test-results/mobile-${name}-typing.png`, fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await controlsVisible();
  assert.equal(await page.locator('#custom-answer').evaluate(el => document.activeElement === el), true, 'Keyboard close can retain focus');
  await page.locator('#custom-answer').evaluate(el => el.blur());
  await controlsVisible();
  await tapNext();
  for (let i = 1; i < 15; i++) {
    assert.ok(await page.locator('.scene-art').evaluate(el => {
      const first = window.YENA_ILLUSTRATIONS.scenes[0];
      const frame = el.getBoundingClientRect();
      return Math.abs(frame.height - frame.width * first.height / first.width) < 1;
    }), 'Mobile image heights match story 1');
    await page.locator('label[for="choice-0"]').scrollIntoViewIfNeeded();
    await page.locator('label[for="choice-0"]').tap();
    if (i === 4) await page.screenshot({ path: `test-results/mobile-${name}-story.png`, fullPage: false });
    await tapNext();
  }
  await page.locator('label[for="choice-0"]').scrollIntoViewIfNeeded();
  await page.locator('label[for="choice-0"]').tap();
  await controlsVisible();
  // Simulate enlarged text to verify reflow and variable-height bottom controls.
  const enlarged = await page.addStyleTag({ content: '.story-copy p,.choice,.response-box,.primary-button,.secondary-button{font-size:36px!important}.question-panel h2{font-size:40px!important}' });
  await page.setViewportSize({ width: 320, height: 568 });
  await noOverflow('200% text');
  await controlsVisible();
  const reserved = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom));
  const controls = await page.locator('#mobile-controls').boundingBox();
  assert.ok(reserved >= controls.height, 'Space is reserved for resized controls');
  await enlarged.evaluate(el => el.remove());
  await page.setViewportSize({ width: 390, height: 844 });
  await tapNext();
  assert.ok(await page.locator('#mobile-controls').isHidden(), 'No game controls on the letter');
  for (const [width, height] of [[320,568],[844,390]]) {
    await page.setViewportSize({ width, height });
    await noOverflow('envelope');
  }
  await page.getByText('마음을 열어볼래?', { exact: true }).tap();
  assert.ok(await page.locator('.letter-paper').isHidden());
  await page.locator('[data-action="open-letter"]').tap();
  await page.evaluate(() => document.fonts.ready);
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await noOverflow(`letter ${width}x${height}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `test-results/mobile-${name}-letter.png`, fullPage: true });
  assert.equal(await page.locator('[data-action="copy"], [data-action="share"], .response-box, .save-note').count(), 0);
  await page.reload();
  assert.ok(await page.locator('.letter-paper').isVisible());
  assert.deepEqual(failures, [], `${name}: no JS or network errors`);
  await context.close();
  await browser.close();
  console.log(`${name}: touch playthrough, 12 viewport sizes, portrait/landscape, fixed controls, stable selection, typing viewport, enlarged text, dialogs and letter passed.`);
}
