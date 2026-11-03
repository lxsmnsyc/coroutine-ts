// The example prints the order in which the threads run.
/* oxlint-disable no-console */
import { Coroutine } from 'coroutine-ts';

type Task = (...args: unknown[]) => Promise<void>;

interface Thread {
  state: 'new' | 'running' | 'suspend' | 'wait' | 'dead';
  co: Coroutine<void>;
  arg: unknown[];
  suspendTime?: number;
  resumeTime?: number;
}

// `true` with the time to sleep while threads remain, `false` with the reason when none do.
type Selection = [true, number] | [false, unknown];

const current = Date.now();

function getCurrent(): number {
  return Date.now() - current;
}

async function sleep(time: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

class Scheduler {
  private readonly threads: (Thread | null)[] = [];

  async select(): Promise<Selection> {
    let shortest: number | undefined;

    for (const [i, thread] of this.threads.entries()) {
      if (!thread) {
        continue;
      }
      let ret;

      // Start or resume the first thread that is ready.
      switch (thread.state) {
        case 'wait':
          if (thread.resumeTime !== undefined && getCurrent() >= thread.resumeTime) {
            thread.resumeTime = undefined;
            thread.state = 'running';
            this.threads[i] = null;
            ret = await thread.co.resume(getCurrent() - (thread.suspendTime ?? 0), ...thread.arg);
            thread.suspendTime = undefined;
            thread.arg = [];
          } else if (
            thread.resumeTime !== undefined &&
            (shortest === undefined || thread.resumeTime < shortest)
          ) {
            shortest = thread.resumeTime;
          }
          break;
        case 'suspend':
          thread.state = 'running';
          this.threads[i] = null;
          ret = await thread.co.resume(...thread.arg);
          thread.arg = [];
          break;
        case 'new':
          thread.state = 'running';
          this.threads[i] = null;
          ret = await thread.co.start(...thread.arg);
          thread.arg = [];
          break;
        default:
          break;
      }

      // A task returns nothing, so only a yield needs handling.
      if (ret === undefined || ret.done) {
        continue;
      }
      const [act, ...rest] = ret.value;

      // Queue the thread again from what it yielded.
      if (act === 'suspend') {
        thread.arg = rest;
        thread.state = 'suspend';
        this.threads.push(thread);
      } else if (act === 'wait') {
        const [wait, ...remain] = rest;
        thread.arg = remain;
        thread.suspendTime = getCurrent();
        thread.resumeTime = getCurrent() + Number(wait);
        thread.state = 'wait';
        this.threads.unshift(thread);
      }
      return [true, 0];
    }

    if (shortest !== undefined) {
      return [true, shortest];
    }
    return [false, 'no threads'];
  }

  spawn(fn: Task, ...args: unknown[]): void {
    this.threads.push({
      state: 'new',
      co: new Coroutine(fn),
      arg: args,
    });
  }

  async run(fn: Task, ...args: unknown[]): Promise<void> {
    this.threads.unshift({
      state: 'new',
      co: new Coroutine(fn),
      arg: args,
    });
    await Coroutine.yield('suspend');
  }

  static async suspend(...args: unknown[]): Promise<unknown[]> {
    return Coroutine.yield('suspend', ...args);
  }

  static async wait(time: number, ...args: unknown[]): Promise<unknown[]> {
    return Coroutine.yield('wait', time, ...args);
  }
}

const scheduler = new Scheduler();

for (let i = 0; i < 10; i++) {
  // A coroutine runs a function that returns a promise, even when it never awaits.
  // oxlint-disable-next-line typescript/require-await
  scheduler.spawn(async () => {
    console.log('outer started', i, getCurrent());
    scheduler.spawn(async () => {
      console.log('inner started', i, getCurrent());
      await Scheduler.wait(i * 500);
      console.log('inner finished', i, getCurrent());
    });
    console.log('outer finished', i, getCurrent());
  });
}

// Run the threads until none remain.
let selection = await scheduler.select();
while (selection[0]) {
  console.log('sleeping', selection[1]);
  await sleep(selection[1]);
  selection = await scheduler.select();
}
console.log(false, selection[1]);
