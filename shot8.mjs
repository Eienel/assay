import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const d = await b.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' });
await d.goto('http://localhost:3000', { waitUntil: 'load' });
await d.waitForTimeout(3000);
await d.screenshot({ path: '/tmp/hero3d-desk.png', animations: 'disabled' });
// zoom crop of just the medallion area
await d.screenshot({ path: '/tmp/hero3d-crop.png', clip: { x: 720, y: 60, width: 520, height: 420 }, animations: 'disabled' });
const m = await b.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
await m.goto('http://localhost:3000', { waitUntil: 'load' });
await m.waitForTimeout(3000);
await m.screenshot({ path: '/tmp/hero3d-mob.png', animations: 'disabled' });
await b.close();
