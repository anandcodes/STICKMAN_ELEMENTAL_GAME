import fs from 'node:fs';
import path from 'node:path';
import { normalizeGestureScenario } from '../src/game/mobile/gestureContract';
import { MOBILE_AUTOMATION_FLOWS, type BrowserPreludeStep } from '../src/game/mobile/automationFlows';
import { MOBILE_TEST_SCENARIOS } from '../src/game/mobile/testScenarios';

interface Args {
  url: string;
  scenario?: string;
  screenshotDir: string;
  clickSelector?: string;
  headless: boolean;
  pressKey?: string;
  prelude?: string;
  preludeJson?: string;
  flow?: string;
  runAllScenarios: boolean;
  list: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    url: '',
    screenshotDir: 'output/mobile-multitouch',
    headless: true,
    runAllScenarios: false,
    list: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--url' && next) {
      args.url = next;
      i++;
    } else if (arg === '--scenario' && next) {
      args.scenario = next;
      i++;
    } else if (arg === '--screenshot-dir' && next) {
      args.screenshotDir = next;
      i++;
    } else if (arg === '--click-selector' && next) {
      args.clickSelector = next;
      i++;
    } else if (arg === '--headless' && next) {
      args.headless = next !== '0' && next !== 'false';
      i++;
    } else if (arg === '--press-key' && next) {
      args.pressKey = next;
      i++;
    } else if (arg === '--prelude' && next) {
      args.prelude = next;
      i++;
    } else if (arg === '--prelude-json' && next) {
      args.preludeJson = next;
      i++;
    } else if (arg === '--flow' && next) {
      args.flow = next;
      i++;
    } else if (arg === '--run-all-scenarios') {
      args.runAllScenarios = true;
    } else if (arg === '--list') {
      args.list = true;
    }
  }

  if (!args.list && !args.url) {
    throw new Error('--url is required');
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.list) {
    printAvailableAutomation();
    return;
  }

  fs.mkdirSync(args.screenshotDir, { recursive: true });
  const flow = args.flow ? MOBILE_AUTOMATION_FLOWS[args.flow] : undefined;
  if (args.flow && !flow) {
    throw new Error(`Unknown flow: ${args.flow}`);
  }
  const scenarioNames = resolveScenarioNames(args, flow?.scenarioNames ?? []);
  if (scenarioNames.length === 0) {
    throw new Error('No scenarios selected');
  }

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: args.headless });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
    isMobile: true,
  });
  const client = await page.context().newCDPSession(page);
  const activeTouches = new Map<number, { x: number; y: number }>();
  const canvasSelector = 'canvas';

  await page.goto(args.url, { waitUntil: 'networkidle' });
  if (args.clickSelector) {
    await page.click(args.clickSelector);
  }
  if (args.pressKey) {
    await page.keyboard.press(args.pressKey);
  }
  await runPrelude(page, canvasSelector, args, flow?.prelude ?? []);

  for (const scenarioName of scenarioNames) {
    await releaseActiveTouches(client, activeTouches);
    const scenario = MOBILE_TEST_SCENARIOS[scenarioName];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }
    activeTouches.clear();
    const normalized = normalizeGestureScenario(scenario);
    for (const step of normalized.steps) {
      const contacts = step.batchContacts ?? [];
      if (contacts.length > 0) {
        const dispatchType = contacts.some((contact) => contact.phase === 'start')
          ? 'touchStart'
          : contacts.some((contact) => contact.phase === 'move')
            ? 'touchMove'
            : contacts.some((contact) => contact.phase === 'cancel')
              ? 'touchCancel'
              : 'touchEnd';

        if (dispatchType === 'touchStart' || dispatchType === 'touchMove') {
          for (const contact of contacts) {
            if (contact.phase === 'start' || contact.phase === 'move') {
              activeTouches.set(contact.id, { x: contact.x, y: contact.y });
            }
          }
        }

        const payloadTouches = new Map(activeTouches);
        if (dispatchType === 'touchEnd') {
          for (const contact of contacts) {
            if (contact.phase === 'end' || contact.phase === 'cancel') {
              payloadTouches.delete(contact.id);
            }
          }
        }

        await client.send('Input.dispatchTouchEvent', {
          type: dispatchType,
          touchPoints: dispatchType === 'touchCancel'
            ? []
            : Array.from(payloadTouches.entries()).map(([id, point]) => ({
            id,
            x: point.x,
            y: point.y,
            radiusX: 10,
            radiusY: 10,
            force: 0.8,
          })),
        });

        if (dispatchType === 'touchCancel') {
          activeTouches.clear();
          continue;
        }
        for (const contact of contacts) {
          if (contact.phase === 'end' || contact.phase === 'cancel') {
            activeTouches.delete(contact.id);
          }
        }
      }

      for (let i = 0; i < (step.waitFrames ?? 1); i++) {
        await advanceFrame(page, 1000 / 60 + (step.jitterMs ?? 0));
      }
    }

    const screenshotPath = path.join(args.screenshotDir, `${normalized.name}.png`);
    const statePath = path.join(args.screenshotDir, `${normalized.name}.json`);
    await page.locator(canvasSelector).screenshot({ path: screenshotPath });
    const stateText = await page.evaluate(() => {
      const renderText = (window as Window & { render_game_to_text?: () => string }).render_game_to_text;
      return typeof renderText === 'function' ? renderText() : '';
    });
    fs.writeFileSync(statePath, stateText);
    await releaseActiveTouches(client, activeTouches);
  }
  await browser.close();
}

async function loadPlaywright(): Promise<{ chromium: typeof import('playwright').chromium }> {
  try {
    return await import('playwright');
  } catch {
    const codexHome = process.env.CODEX_HOME ?? path.join(process.env.HOME ?? '', '.codex');
    const fallback = path.join(codexHome, 'skills', 'develop-web-game', 'node_modules', 'playwright', 'index.mjs');
    return await import(fallback);
  }
}

async function releaseActiveTouches(
  client: import('playwright').CDPSession,
  activeTouches: Map<number, { x: number; y: number }>,
): Promise<void> {
  if (activeTouches.size === 0) return;
  try {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchCancel',
      touchPoints: [],
    });
  } catch {
    // Best-effort cleanup between scenarios; local state still resets.
  }
  activeTouches.clear();
}

async function runPrelude(
  page: import('playwright').Page,
  canvasSelector: string,
  args: Args,
  flowPrelude: BrowserPreludeStep[],
): Promise<void> {
  const steps = parsePrelude(args, flowPrelude);
  for (const step of steps) {
    if (step.type === 'clickSelector') {
      await page.click(step.selector);
      if (step.waitMs) await page.waitForTimeout(step.waitMs);
      continue;
    }
    if (step.type === 'pressKey') {
      await page.keyboard.press(step.key);
      if (step.waitMs) await page.waitForTimeout(step.waitMs);
      continue;
    }
    if (step.type === 'tapCanvas') {
      await tapCanvas(page, canvasSelector, step.x, step.y, step.normalized ?? false);
      if (step.waitMs) await page.waitForTimeout(step.waitMs);
      continue;
    }
    if (step.type === 'waitFrames') {
      for (let i = 0; i < step.frames; i++) {
        await advanceFrame(page, 1000 / 60 + (step.jitterMs ?? 0));
      }
      continue;
    }
    await waitForState(page, step.path, step.equals, step.timeoutMs ?? 3_000, step.pollMs ?? 50);
  }
}

function parsePrelude(args: Args, flowPrelude: BrowserPreludeStep[]): BrowserPreludeStep[] {
  const steps: BrowserPreludeStep[] = [...flowPrelude];
  if (args.prelude) {
    const preludeKey = args.prelude === 'campaign_level0_intro_skip' ? 'campaign_level0' : args.prelude;
    const builtin = MOBILE_AUTOMATION_FLOWS[preludeKey]?.prelude;
    if (!builtin) {
      throw new Error(`Unknown prelude: ${args.prelude}`);
    }
    steps.push(...builtin);
  }
  if (args.preludeJson) {
    const parsed = JSON.parse(args.preludeJson) as BrowserPreludeStep[];
    steps.push(...parsed);
  }
  return steps;
}

function resolveScenarioNames(args: Args, flowScenarioNames: string[]): string[] {
  if (args.runAllScenarios) {
    return flowScenarioNames.length > 0 ? flowScenarioNames : Object.keys(MOBILE_TEST_SCENARIOS);
  }
  if (args.scenario) {
    return [args.scenario];
  }
  if (flowScenarioNames.length > 0) {
    return [flowScenarioNames[0]];
  }
  return ['aim_drag_dash_overlap'];
}

function printAvailableAutomation(): void {
  console.log('Flows:');
  Object.values(MOBILE_AUTOMATION_FLOWS).forEach((flow) => {
    console.log(`- ${flow.name}: ${flow.description}`);
    console.log(`  scenarios: ${flow.scenarioNames.join(', ')}`);
  });
  console.log('Scenarios:');
  Object.values(MOBILE_TEST_SCENARIOS).forEach((scenario) => {
    console.log(`- ${scenario.name}: ${scenario.description}`);
  });
}

async function tapCanvas(
  page: import('playwright').Page,
  canvasSelector: string,
  x: number,
  y: number,
  normalized: boolean,
): Promise<void> {
  const box = await page.locator(canvasSelector).boundingBox();
  if (!box) {
    throw new Error(`Unable to resolve canvas bounds for selector: ${canvasSelector}`);
  }
  const targetX = normalized ? box.x + box.width * x : box.x + x;
  const targetY = normalized ? box.y + box.height * y : box.y + y;
  await page.touchscreen.tap(targetX, targetY);
}

async function advanceFrame(page: import('playwright').Page, frameMs: number): Promise<void> {
  await page.evaluate(async (nextFrameMs) => {
    const advance = (window as Window & { advanceTime?: (ms: number) => Promise<void> | void }).advanceTime;
    if (typeof advance === 'function') {
      await advance(nextFrameMs);
    }
  }, frameMs);
}

async function waitForState(
  page: import('playwright').Page,
  pathExpression: string,
  expected: boolean | number | string | null,
  timeoutMs: number,
  pollMs: number,
): Promise<void> {
  const serializedExpected = JSON.stringify(expected);
  await page.waitForFunction(
    ([path, expectedValue]) => {
      const renderText = (window as Window & { render_game_to_text?: () => string }).render_game_to_text;
      if (typeof renderText !== 'function') {
        return false;
      }
      const payload = JSON.parse(renderText()) as Record<string, unknown>;
      const actual = path.split('.').reduce<unknown>((value, part) => (
        value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined
      ), payload);
      return JSON.stringify(actual) === expectedValue;
    },
    [pathExpression, serializedExpected],
    { timeout: timeoutMs, polling: pollMs },
  );
}

void main();
