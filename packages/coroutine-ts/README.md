# coroutine-ts

> Coroutines in TypeScript/JavaScript. Inspired by Lua coroutines.

[![NPM](https://img.shields.io/npm/v/coroutine-ts.svg)](https://www.npmjs.com/package/coroutine-ts) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-airbnb-brightgreen.svg)](https://github.com/airbnb/javascript) [![Build Status](https://travis-ci.com/LXSMNSYC/coroutine-ts.svg?branch=master)](https://travis-ci.com/LXSMNSYC/coroutine-ts) [![codecov](https://codecov.io/gh/LXSMNSYC/coroutine-ts/branch/master/graph/badge.svg)](https://codecov.io/gh/LXSMNSYC/coroutine-ts)

## Install

```bash
npm install --save coroutine-ts
```

```bash
yarn add coroutine-ts
```

## Usage

From [Coroutines Tutorial](http://lua-users.org/wiki/CoroutinesTutorial):

> Coroutines allow us to execute several tasks at once. This is done in a controlled manner by passing control to each routine and waiting until the routine says it has finished. We can reenter the routine to continue at a later time and by doing this repeatedly we achieve multi-tasking. 

### Yielding

In order for multiple coroutines to share execution they must stop executing (after performing a sensible amount of processing) and pass control to another thread. This act of submission is called yielding. Coroutines explicitly call a method `.yield()`, which is similar to using return in functions. What differentiates yielding from function returns is that at a later point we can reenter the thread and carry on where we left off. When you exit a function scope using return the scope is destroyed and we cannot reenter it.

### Simple Usage

To create a coroutine we must have an async function which represents it, e.g., 

```javascript
async function foo() {
  console.log('foo 1');
  await this.yield();
  console.log('foo 2');
}
```

We create a coroutine using the `new Coroutine(fn)` constructor.

```javascript
const co = new Coroutine(foo);
```

We can find out what state the thread is in using the `Coroutine.status` getter:
```javascript
console.log(co.status); // 'uncalled'
```

There are 4 kinds of states:
* `uncalled` - The coroutine hasn't been called yet.
* `suspended` - The coroutine has been called, running and was suspended through yielding.
* `running` - The coroutine was resumed from being suspended.
* `dead` - The coroutine has finished the evaluation and can no longer be resumed nor yielded.

To start a coroutine, we use the method `.start`, which may accept the parameters to be passed to our async function. This method returns a Promise which resolves to a `CoroutineResult`, which has a property `done` that represents if the coroutine has finished evaluation, and the property `value` which is the yielded value or the returne value from the function. This state changes from `uncalled` to `running`, after which it becomes `suspended` if the coroutine yields or `dead` if the function ends.

```javascript
co.start(); // foo 1
```

The function will then leave after the coroutine yields or the function ends. In our example, we yielded before the next log, and so we need to call the `resume` method which is similar to `start` except that it can only be called if the coroutine yielded:

```javascript
co.resume(); // foo 2
```

Resuming a coroutine returns a Promise which resolves to the value being yielded. Meanwhile, yielding a coroutine returns a Promise which resolves to the value being passed to the coroutine when resuming. This is a good way to pass values from and to our coroutine.

```javascript
async function pass(x) {
  console.log('Received: ', x);
  console.log('Received: ', ...(await this.yield(x)));
}

const co = new Coroutine(pass);

const result1 = await co.start(1); // Received: 1
console.log('Sent: ', result1.value); // Sent: 1
const result2 = await co.resume(2); // Received: 2
console.log('Sent: ', result2.value); // Sent: undefined
```

### Difference to Lua coroutines

* Lua coroutine methods are accessible as table fields, not as instance methods.
* Lua coroutine methods can know about the current running coroutine instance, so you can always call the `yield` function even without passing the coroutine instance.

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)