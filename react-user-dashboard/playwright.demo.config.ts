import { defineConfig } from '@playwright/test';

const baseURL = process.env.DEMO_BROWSER_URL || 'http://127.0.0.1:4317';
if (!['localhost','127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error('Browser tests must target a local disposable demo');
export default defineConfig({
  testDir:'./test/demo', workers:1, timeout:45000,
  use:{ baseURL, viewport:{width:1440,height:1000}, trace:'retain-on-failure' },
});
