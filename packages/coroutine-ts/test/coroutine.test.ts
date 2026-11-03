import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  Coroutine,
  CoroutineDeadResumeError,
  CoroutineDeadStartError,
  CoroutineDeadYieldError,
  CoroutineMultiResumeError,
  CoroutineMultiStartError,
  CoroutineMultiYieldError,
  CoroutineUncalledResumeError,
  CoroutineUncalledYieldError,
} from '../src';

async function defer(): Promise<void> {
  return Promise.resolve();
}

describe('Coroutine', () => {
  /**
   * Start method
   */
  describe('#start', () => {
    it('should pass values in and out with the types of the function.', async () => {
      const example = new Coroutine(async function body(x: number) {
        const [y] = await this.yield(x * 2);
        return `${x} ${String(y)}`;
      });

      expectTypeOf<Parameters<typeof example.start>>().toEqualTypeOf<[x: number]>();

      const first = await example.start(1);
      expect(first).toEqual({ done: false, value: [2] });
      const last = await example.resume('a');
      expect(last).toEqual({ done: true, value: '1 a' });
      if (last.done) {
        const value: string = last.value;
        expect(value).toBe('1 a');
      }
    });
    it('should call the function with the coroutine as `this`.', async () => {
      let bound = false;
      const example = new Coroutine(async function body(this: unknown) {
        bound = this === example;
        await Coroutine.yield();
      });

      await example.start();

      expect(bound).toBe(true);
    });
    it('should throw an error when started multiple times.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      const pending = example.start();

      await expect(example.start()).rejects.toBeInstanceOf(CoroutineMultiStartError);
      await pending;
    });
    it('should throw an error when started after running.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();
      const pending = example.resume();

      await expect(example.start()).rejects.toBeInstanceOf(CoroutineMultiStartError);
      await pending;
    });
    it('should throw an error when started after finishing.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();
      await example.resume();

      await expect(example.start()).rejects.toBeInstanceOf(CoroutineDeadStartError);
    });
    it('should throw an error when function throws an error synchronously.', async () => {
      const example = new Coroutine(() => {
        throw new Error();
      });

      await expect(example.start()).rejects.toBeInstanceOf(Error);
    });
    it('should throw an error when function throws an error asynchronously.', async () => {
      const example = new Coroutine(async () => {
        await defer();
        throw new Error();
      });

      await expect(example.start()).rejects.toBeInstanceOf(Error);
    });
  });
  /**
   * Resume method
   */
  describe('#resume', () => {
    it('should throw an error when resumed before starting.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await expect(example.resume()).rejects.toBeInstanceOf(CoroutineUncalledResumeError);
    });
    it('should throw an error when resumed multiple times.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();
      const pending = example.resume();

      await expect(example.resume()).rejects.toBeInstanceOf(CoroutineMultiResumeError);
      await pending;
    });
    it('should throw an error when started after finishing.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();
      await example.resume();

      await expect(example.resume()).rejects.toBeInstanceOf(CoroutineDeadResumeError);
    });
    it('should throw an error when function throws an error.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
        throw new Error();
      });

      await example.start();

      await expect(example.resume()).rejects.toBeInstanceOf(Error);
    });
  });
  /**
   * yield method
   */
  describe('#yield', () => {
    it('should throw an error when yielded before starting.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await expect(example.yield()).rejects.toBeInstanceOf(CoroutineUncalledYieldError);
    });
    it('should throw an error when yielded multiple times.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();

      await expect(example.yield()).rejects.toBeInstanceOf(CoroutineMultiYieldError);
    });
    it('should throw an error when yielded after finishing.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();
      await example.resume();

      await expect(example.yield()).rejects.toBeInstanceOf(CoroutineDeadYieldError);
    });
  });
  /**
   * Status getter
   */
  describe('#status', () => {
    it("should return 'uncalled' for a newly created Coroutine", () => {
      const example = new Coroutine(async () => Promise.resolve(null));

      expect(example.status).toEqual('uncalled');
    });
    it("should return 'running' for a started Coroutine", async () => {
      const example = new Coroutine(async () => Promise.resolve(null));

      const pending = example.start();

      expect(example.status).toEqual('running');
      await pending;
    });
    it("should return 'suspended' for a yielded Coroutine", async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();

      expect(example.status).toEqual('suspended');
    });
    it("should return 'running' for a resumed Coroutine", async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();
      const pending = example.resume();

      expect(example.status).toEqual('running');
      await pending;
    });
    it("should return 'dead' for a finished Coroutine", async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();
      await example.resume();

      expect(example.status).toEqual('dead');
    });
  });
});
