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
export default class Deferred<T> implements PromiseLike<T> {
  private promise: Promise<T>;

  private res?: (value?: T) => void;

  private rej?: (reason?: any) => void;

  constructor() {
    this.promise = new Promise((res, rej) => {
      this.res = res;
      this.rej = rej;
    });
  }

  public success(value?: T): void {
    if (this.res) {
      this.res(value);
    }
  }

  public failure(reason?: any): void {
    if (this.rej) {
      this.rej(reason);
    }
  }

  public then<T1 = T, T2 = never>(
    onfulfilled?: ((value: T) => T1 | PromiseLike<T1>) | undefined | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | undefined | null,
  ): Promise<T1 | T2> {
    return this.promise.then(onfulfilled, onrejected);
  }
}
