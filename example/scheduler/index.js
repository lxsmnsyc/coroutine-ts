const { Coroutine } = require('../../dist');

const current = Date.now();

function getCurrent() {
  return Date.now() - current;
}

class Scheduler {
  constructor() {
    this.threads = [];
  }

  async select() {
    let shortest;

    for (let i = 0; i < this.threads.length; i++) {
      const thread = this.threads[i];

      if (!thread) {
        continue;
      }
      const state = thread.state;
      let ret;
      
      switch (state) {
        case 'wait':
          if (getCurrent() >= thread.resumeTime) {
            thread.resumeTime = null;
            thread.state = "running";
            this.threads[i] = null;
            ret = await thread.co.resume(getCurrent() - thread.suspendTime, ...thread.arg),
            thread.suspendTime = null;
            thread.arg = null;
          } else if ((!shortest) || thread.resumeTime < shortest) {
            shortest = thread.resumeTime;
          }
          break;
        case 'suspend':
          thread.state = "running";
          this.threads[i] = null;
          ret = await thread.co.resume(...thread.arg),
          thread.arg = null;
          break;
        case 'new':
          thread.state = "running";
          this.threads[i] = null;
          ret = await thread.co.start(...thread.arg)
          thread.arg = null;
          break;
        default:
          break;
      }

      if (ret && ret.value) {
        const [act, ...rest] = ret.value;

        if (ret.done) {
          return [false, act];
        }
        const status = thread.co.status;

        if (status === "dead") {
          thread.state = "dead";
        } else if (act === "suspend") {
          thread.arg = rest;
          thread.state = "suspend";
          this.threads.push(thread);
        } else if (act === "wait") {
          const [wait, ...remain] = rest;
          thread.arg = remain;
          thread.suspendTime = getCurrent();
          thread.resumeTime = getCurrent() + wait;
          thread.state = "wait";
          this.threads.unshift(thread);
        }
        return [true, 0];
      }
    }

    if (shortest) {
      return [true, shortest];
    }
    return [false, "no threads"];
  }

  spawn(fn, ...args) {
    this.threads.push({
      state: "new",
      co: new Coroutine(fn),
      arg: args,
    });
  }

  async run(fn, ...args) {
    this.threads.unshift({
      state: "new",
      co: new Coroutine(fn),
      arg: args,
    });
    await Coroutine.yield("suspend");
  }

  async suspend(...args) {
    return await Coroutine.yield("suspend", ...args);
  }

  async wait(time, ...args) {
    return await Coroutine.yield("wait", time, ...args);
  }
}

const sleep = (time) => new Promise((res) => setTimeout(res, time, true));

(async () => {
  const scheduler = new Scheduler();

  for (let i = 0; i < 10; i++) {
    scheduler.spawn(async function () {
      console.log("outer started", i, getCurrent());
      scheduler.spawn(async function () {
        console.log("inner started", i, getCurrent());
        await scheduler.wait(i * 500);
        console.log("inner finished", i, getCurrent());
      });
      console.log("outer finished", i, getCurrent());
    });
  }

  while (true) {
    const [worked, t] = await scheduler.select();

    if (worked) {
      if (t != null) {
        console.log("sleeping", t);
        await sleep(t);
      }
    } else {
      console.log(worked, t);
      break;
    }
  }
})();
