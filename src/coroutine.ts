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
import { CoroutineStatus, CoroutineResumeResult } from './types';
import Deferred from './deferred';
import CoroutineDeadStartError from './error/dead-start';
import CoroutineMultiStartError from './error/multi-start';
import CoroutineDeadResumeError from './error/dead-resume';
import CoroutineUncalledResumeError from './error/uncalled-resume';
import CoroutineMultiResumeError from './error/multi-resume';
import CoroutineDeadYieldError from './error/dead-yield';
import CoroutineUncalledYieldError from './error/uncalled-yield';
import CoroutineMultiYieldError from './error/multi-yield';

export default class Coroutine<
  Yield,
  Args extends any[],
  Callback extends ((...args: Args) => Promise<Yield>),
> {
  private callback: Callback;

  private cstatus: CoroutineStatus;

  private running?: Deferred<CoroutineResumeResult<Yield>>;

  private halting?: Deferred<any>;

  constructor(callback: Callback) {
    this.callback = callback;
    this.cstatus = 'uncalled';
  }

  public async start(...args: Args): Promise<CoroutineResumeResult<Yield>> {
    switch (this.cstatus) {
      case 'dead': throw new CoroutineDeadStartError();
      case 'suspended': throw new CoroutineMultiStartError();
      case 'running': throw new CoroutineMultiStartError();
      case 'uncalled':
      default: break;
    }

    this.cstatus = 'running';

    this.running = new Deferred<CoroutineResumeResult<Yield>>();

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
        },
        (value) => {
          if (this.running) {
            this.running.failure(value);
          }
          this.cstatus = 'dead';
        },
      );
    } catch (err) {
      this.running.failure(err);
    }

    return this.running;
  }

  public async resume<T extends any[]>(...args: T): Promise<CoroutineResumeResult<Yield>> {
    switch (this.cstatus) {
      case 'dead': throw new CoroutineDeadResumeError();
      case 'uncalled': throw new CoroutineUncalledResumeError();
      case 'running': throw new CoroutineMultiResumeError();
      case 'suspended':
      default: break;
    }

    this.cstatus = 'running';

    if (this.halting) {
      this.halting.success(args);
    }

    this.running = new Deferred<CoroutineResumeResult<Yield>>();

    return this.running;
  }

  public async yield<R extends any[]>(value?: Yield): Promise<R> {
    switch (this.cstatus) {
      case 'dead': throw new CoroutineDeadYieldError();
      case 'uncalled': throw new CoroutineUncalledYieldError();
      case 'suspended': throw new CoroutineMultiYieldError();
      case 'running':
      default: break;
    }

    this.cstatus = 'suspended';

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

  public get status(): CoroutineStatus {
    return this.cstatus;
  }
}
