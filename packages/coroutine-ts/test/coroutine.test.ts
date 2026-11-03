import { describe, expect, it } from 'vitest';
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
    it('should throw an error when started multiple times.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      example.start();

      try {
        await example.start();
      } catch (err) {
        expect(err).toBeInstanceOf(CoroutineMultiStartError);
        return;
      }

      return null;
    });
    it('should throw an error when started after running.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();
      example.resume();

      try {
        await example.start();
      } catch (err) {
        expect(err).toBeInstanceOf(CoroutineMultiStartError);
        return;
      }

      return null;
    });
    it('should throw an error when started after finishing.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();
      await example.resume();

      try {
        await example.start();
      } catch (err) {
        expect(err).toBeInstanceOf(CoroutineDeadStartError);
        return;
      }

      return null;
    });
    it('should throw an error when function throws an error synchronously.', async () => {
      const example = new Coroutine(() => {
        throw new Error();
      });

      try {
        await example.start();
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        return;
      }
      expect.fail('should throw an Error');
      return null;
    });
    it('should throw an error when function throws an error asynchronously.', async () => {
      const example = new Coroutine(async () => {
        await defer();
        throw new Error();
      });

      try {
        await example.start();
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        return;
      }
      expect.fail('should throw an Error');
      return null;
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

      try {
        await example.resume();
      } catch (err) {
        expect(err).toBeInstanceOf(CoroutineUncalledResumeError);
        return;
      }

      return null;
    });
    it('should throw an error when resumed multiple times.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();
      example.resume();

      try {
        await example.resume();
      } catch (err) {
        expect(err).toBeInstanceOf(CoroutineMultiResumeError);
        return;
      }

      return null;
    });
    it('should throw an error when started after finishing.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();
      await example.resume();

      try {
        await example.resume();
      } catch (err) {
        expect(err).toBeInstanceOf(CoroutineDeadResumeError);
        return;
      }

      return null;
    });
    it('should throw an error when function throws an error.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
        throw new Error();
      });

      await example.start();

      try {
        await example.resume();
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        return;
      }
      expect.fail('should throw an Error');
      return null;
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

      try {
        await example.yield();
      } catch (err) {
        expect(err).toBeInstanceOf(CoroutineUncalledYieldError);
        return;
      }

      return null;
    });
    it('should throw an error when yielded multiple times.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();

      try {
        await example.yield();
      } catch (err) {
        expect(err).toBeInstanceOf(CoroutineMultiYieldError);
        return;
      }

      return null;
    });
    it('should throw an error when yielded after finishing.', async () => {
      const example = new Coroutine(async () => {
        await Coroutine.yield();
      });

      await example.start();
      await example.resume();

      try {
        await example.yield();
      } catch (err) {
        expect(err).toBeInstanceOf(CoroutineDeadYieldError);
        return;
      }

      return null;
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
    it("should return 'running' for a started Coroutine", () => {
      const example = new Coroutine(async () => Promise.resolve(null));

      example.start();

      expect(example.status).toEqual('running');
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
      example.resume();

      expect(example.status).toEqual('running');
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
