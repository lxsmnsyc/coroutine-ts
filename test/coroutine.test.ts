import {
  Coroutine,
  CoroutineMultiStartError,
  CoroutineDeadStartError,
  CoroutineMultiResumeError,
  CoroutineUncalledResumeError,
  CoroutineDeadResumeError,
  CoroutineUncalledYieldError,
  CoroutineMultiYieldError,
  CoroutineDeadYieldError,
} from '../src';

function defer(): Promise<void> {
  return Promise.resolve();
}

describe('Coroutine', () => {
  /**
   * Start method
   */
  describe('#start', () => {
    it('should throw an error when started multiple times.', async () => {
      const example = new Coroutine(async () => {
        await example.yield();
      });

      example.start();

      try {
        await example.start();
      } catch (err) {
        return expect(err).toBeInstanceOf(CoroutineMultiStartError);
      }

      return null;
    });
    it('should throw an error when started after running.', async () => {
      const example = new Coroutine(async () => {
        await example.yield();
      });

      await example.start();
      example.resume();

      try {
        await example.start();
      } catch (err) {
        return expect(err).toBeInstanceOf(CoroutineMultiStartError);
      }

      return null;
    });
    it('should throw an error when started after finishing.', async () => {
      const example = new Coroutine(async () => {
        await example.yield();
      });

      await example.start();
      await example.resume();

      try {
        await example.start();
      } catch (err) {
        return expect(err).toBeInstanceOf(CoroutineDeadStartError);
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
        return expect(err).toBeInstanceOf(Error);
      }
      fail('should throw an Error');
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
        return expect(err).toBeInstanceOf(Error);
      }
      fail('should throw an Error');
      return null;
    });
  });
  /**
   * Resume method
   */
  describe('#resume', () => {
    it('should throw an error when resumed before starting.', async () => {
      const example = new Coroutine(async () => {
        await example.yield();
      });

      try {
        await example.resume();
      } catch (err) {
        return expect(err).toBeInstanceOf(CoroutineUncalledResumeError);
      }

      return null;
    });
    it('should throw an error when resumed multiple times.', async () => {
      const example = new Coroutine(async () => {
        await example.yield();
      });

      await example.start();
      example.resume();

      try {
        await example.resume();
      } catch (err) {
        return expect(err).toBeInstanceOf(CoroutineMultiResumeError);
      }

      return null;
    });
    it('should throw an error when started after finishing.', async () => {
      const example = new Coroutine(async () => {
        await example.yield();
      });

      await example.start();
      await example.resume();

      try {
        await example.resume();
      } catch (err) {
        return expect(err).toBeInstanceOf(CoroutineDeadResumeError);
      }

      return null;
    });
    it('should throw an error when function throws an error.', async () => {
      const example = new Coroutine(async () => {
        await example.yield();
        throw new Error();
      });

      await example.start();

      try {
        await example.resume();
      } catch (err) {
        return expect(err).toBeInstanceOf(Error);
      }
      fail('should throw an Error');
      return null;
    });
  });
  /**
   * yield method
   */
  describe('#yield', () => {
    it('should throw an error when yielded before starting.', async () => {
      const example = new Coroutine(async () => {
        await example.yield();
      });

      try {
        await example.yield();
      } catch (err) {
        return expect(err).toBeInstanceOf(CoroutineUncalledYieldError);
      }

      return null;
    });
    it('should throw an error when yielded multiple times.', async () => {
      const example = new Coroutine(async () => {
        await example.yield();
      });

      await example.start();

      try {
        await example.yield();
      } catch (err) {
        return expect(err).toBeInstanceOf(CoroutineMultiYieldError);
      }

      return null;
    });
    it('should throw an error when yielded after finishing.', async () => {
      const example = new Coroutine(async () => {
        await example.yield();
      });

      await example.start();
      await example.resume();

      try {
        await example.yield();
      } catch (err) {
        return expect(err).toBeInstanceOf(CoroutineDeadYieldError);
      }

      return null;
    });
  });
  /**
   * Status getter
   */
  describe('#status', () => {
    it("should return 'uncalled' for a newly created Coroutine", () => {
      const example = new Coroutine(() => Promise.resolve(null));

      return expect(example.status).toEqual('uncalled');
    });
    it("should return 'running' for a started Coroutine", () => {
      const example = new Coroutine(() => Promise.resolve(null));

      example.start();

      return expect(example.status).toEqual('running');
    });
    it("should return 'suspended' for a yielded Coroutine", async () => {
      const example = new Coroutine(async () => {
        await example.yield();
      });

      await example.start();

      return expect(example.status).toEqual('suspended');
    });
    it("should return 'running' for a resumed Coroutine", async () => {
      const example = new Coroutine(async () => {
        await example.yield();
      });

      await example.start();
      example.resume();

      return expect(example.status).toEqual('running');
    });
    it("should return 'dead' for a finished Coroutine", async () => {
      const example = new Coroutine(async () => {
        await example.yield();
      });

      await example.start();
      await example.resume();

      return expect(example.status).toEqual('dead');
    });
  });
});
