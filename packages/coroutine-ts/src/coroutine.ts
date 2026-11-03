/**
 * @license
 * MIT License
 *
 * Copyright (c) 2020 Alexis Munsayac
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 *
 * @author Alexis Munsayac <alexis.munsayac@gmail.com>
 * @copyright Alexis Munsayac 2020
 */
import type { CoroutineResult, CoroutineStatus } from './types';
import Deferred from './deferred';
import CoroutineDeadStartError from './error/dead-start';
import CoroutineMultiStartError from './error/multi-start';
import CoroutineDeadResumeError from './error/dead-resume';
import CoroutineUncalledResumeError from './error/uncalled-resume';
import CoroutineMultiResumeError from './error/multi-resume';
import CoroutineDeadYieldError from './error/dead-yield';
import CoroutineUncalledYieldError from './error/uncalled-yield';
import CoroutineMultiYieldError from './error/multi-yield';
import CoroutineNoRunningError from './error/no-running';
import Context from './context';

// Any coroutine, whatever its result and arguments.
export type AnyCoroutine = Coroutine<unknown, never>;

const STACK = new Context<AnyCoroutine>();

// The function a coroutine runs. It gets the coroutine as `this`, typed loosely so that
// TypeScript can still infer Result and Args from the function.
export type CoroutineCallback<Result, Args extends unknown[]> = (
  this: AnyCoroutine,
  ...args: Args
) => Promise<Result>;

export default class Coroutine<Result = unknown, Args extends unknown[] = unknown[]> {
  private readonly callback: CoroutineCallback<Result, Args>;

  private cstatus: CoroutineStatus;

  private running?: Deferred<CoroutineResult<Result>>;

  private halting?: Deferred<unknown[]>;

  constructor(callback: CoroutineCallback<Result, Args>) {
    this.callback = callback;
    this.cstatus = 'uncalled';
  }

  public async start(...args: Args): Promise<CoroutineResult<Result>> {
    /**
     * State switch guard
     */
    switch (this.cstatus) {
      case 'dead':
        throw new CoroutineDeadStartError();
      case 'suspended':
        throw new CoroutineMultiStartError();
      case 'running':
        throw new CoroutineMultiStartError();
      case 'uncalled':
      default:
        break;
    }

    /**
     * Set new state
     */
    this.cstatus = 'running';

    /**
     * Push coroutine as current running coroutine
     */
    if (Coroutine.current !== this) {
      STACK.push(this);
    }

    const running = new Deferred<CoroutineResult<Result>>();
    this.running = running;

    try {
      this.callback(...args).then(
        (value) => {
          if (this.running) {
            this.running.success({
              done: true,
              value,
            });
          }
          this.cstatus = 'dead';
          STACK.pop();
        },
        (value) => {
          if (this.running) {
            this.running.failure(value);
          }
          this.cstatus = 'dead';
          STACK.pop();
        },
      );
    } catch (err) {
      running.failure(err);
      this.cstatus = 'dead';
      STACK.pop();
    }

    return running.promise;
  }

  public async resume(...args: unknown[]): Promise<CoroutineResult<Result>> {
    switch (this.cstatus) {
      case 'dead':
        throw new CoroutineDeadResumeError();
      case 'uncalled':
        throw new CoroutineUncalledResumeError();
      case 'running':
        throw new CoroutineMultiResumeError();
      case 'suspended':
      default:
        break;
    }

    this.cstatus = 'running';

    if (Coroutine.current !== this) {
      STACK.push(this);
    }

    if (this.halting) {
      this.halting.success(args);
    }

    const running = new Deferred<CoroutineResult<Result>>();
    this.running = running;

    return running.promise;
  }

  public async yield(...value: unknown[]): Promise<unknown[]> {
    switch (this.cstatus) {
      case 'dead':
        throw new CoroutineDeadYieldError();
      case 'uncalled':
        throw new CoroutineUncalledYieldError();
      case 'suspended':
        throw new CoroutineMultiYieldError();
      case 'running':
      default:
        break;
    }

    this.cstatus = 'suspended';
    STACK.pop();

    if (this.running) {
      this.running.success({
        done: false,
        value,
      });
    }

    const halting = new Deferred<unknown[]>();
    this.halting = halting;

    return halting.promise;
  }

  public reset(): void {
    this.cstatus = 'uncalled';
    this.running = undefined;
    this.halting = undefined;
  }

  // Throws CoroutineNoRunningError synchronously, so it stays a plain function.
  // oxlint-disable-next-line typescript/promise-function-async
  public static yield(...value: unknown[]): Promise<unknown[]> {
    const current = STACK.peek();

    if (!current) {
      throw new CoroutineNoRunningError();
    }
    return current.value.yield(...value);
  }

  public static get current(): AnyCoroutine | undefined {
    const current = STACK.peek();

    if (!current) {
      return undefined;
    }
    return current.value;
  }

  public get status(): CoroutineStatus {
    return this.cstatus;
  }
}
