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
import { CoroutineStatus, CoroutineResult } from './types';
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

const STACK = new Context<Coroutine<any, any, any>>();

export default class Coroutine<
  Result,
  Args extends any[],
  Callback extends ((...args: Args) => Promise<Result>),
> {
  private callback: Callback;

  private cstatus: CoroutineStatus;

  private running?: Deferred<CoroutineResult<any>>;

  private halting?: Deferred<any>;

  constructor(callback: Callback) {
    this.callback = callback;
    this.cstatus = 'uncalled';
  }

  public async start<R>(...args: Args): Promise<CoroutineResult<R>> {
    /**
     * State switch guard
     */
    switch (this.cstatus) {
      case 'dead': throw new CoroutineDeadStartError();
      case 'suspended': throw new CoroutineMultiStartError();
      case 'running': throw new CoroutineMultiStartError();
      case 'uncalled':
      default: break;
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

    this.running = new Deferred<CoroutineResult<R>>();

    try {
      this.callback.call(this, ...args).then(
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
      this.running.failure(err);
      this.cstatus = 'dead';
      STACK.pop();
    }

    return this.running;
  }

  public async resume<T extends any[], R>(...args: T): Promise<CoroutineResult<R>> {
    switch (this.cstatus) {
      case 'dead': throw new CoroutineDeadResumeError();
      case 'uncalled': throw new CoroutineUncalledResumeError();
      case 'running': throw new CoroutineMultiResumeError();
      case 'suspended':
      default: break;
    }

    this.cstatus = 'running';

    if (Coroutine.current !== this) {
      STACK.push(this);
    }

    if (this.halting) {
      this.halting.success(args);
    }

    this.running = new Deferred<CoroutineResult<R>>();

    return this.running;
  }

  public async yield<T extends any[], R extends any[]>(...value: T): Promise<R> {
    switch (this.cstatus) {
      case 'dead': throw new CoroutineDeadYieldError();
      case 'uncalled': throw new CoroutineUncalledYieldError();
      case 'suspended': throw new CoroutineMultiYieldError();
      case 'running':
      default: break;
    }

    this.cstatus = 'suspended';
    STACK.pop();

    if (this.running) {
      this.running.success({
        done: false,
        value,
      });
    }

    this.halting = new Deferred<R>();

    return this.halting;
  }

  public reset(): void {
    this.cstatus = 'uncalled';
    this.running = undefined;
    this.halting = undefined;
  }

  public static yield<T extends any[], R extends any[]>(...value: T): Promise<R> {
    const current = STACK.peek();

    if (!current) {
      throw new CoroutineNoRunningError();
    }
    return current.value.yield(...value);
  }

  public static get current(): Coroutine<any, any, any> | undefined {
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
