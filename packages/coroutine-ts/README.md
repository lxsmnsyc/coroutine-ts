# coroutine-ts

> Coroutines for async functions, modeled on Lua coroutines. Typed for TypeScript.

[![NPM](https://img.shields.io/npm/v/coroutine-ts.svg)](https://www.npmjs.com/package/coroutine-ts)

A coroutine runs an async function that can pause itself with `yield` and continue later when someone calls `resume`. Values travel both ways: `yield` hands values out, and `resume` hands values back in.

## Install

```bash
pnpm add coroutine-ts
```

```bash
npm install coroutine-ts
```

The package is ESM only.

## Usage

```js
import { Coroutine } from 'coroutine-ts';

const co = new Coroutine(async function () {
  console.log('foo 1');
  await this.yield();
  console.log('foo 2');
});

console.log(co.status); // 'uncalled'
await co.start(); // logs 'foo 1', then pauses at yield
console.log(co.status); // 'suspended'
await co.resume(); // logs 'foo 2'
console.log(co.status); // 'dead'
```

The function gets the coroutine as `this`. An arrow function has no `this` of its own, so it calls `yield` on the coroutine itself:

```js
const co = new Coroutine(async () => {
  await co.yield();
});
```

## Passing values

- `start(...args)` calls the function with `args`.
- `yield(...values)` pauses the function. The promise from `start` or `resume` resolves to `{ done: false, value: values }`, where `values` is an array.
- `resume(...args)` continues the function. The promise from `yield` resolves to `args`, also an array.
- When the function returns, the promise from `start` or `resume` resolves to `{ done: true, value }` with the return value.
- When the function throws, that promise rejects with the error.

```js
const co = new Coroutine(async function (x) {
  const [y] = await this.yield(x * 2);
  return `${x} ${y}`;
});

await co.start(1); // { done: false, value: [2] }
await co.resume('a'); // { done: true, value: '1 a' }
```

## Status

`co.status` is one of:

| Status      | Meaning                                                         |
| ----------- | --------------------------------------------------------------- |
| `uncalled`  | `start` has not been called yet.                                |
| `running`   | The function is running, after `start` or `resume`.             |
| `suspended` | The function is paused at `yield` and waits for `resume`.       |
| `dead`      | The function returned or threw. The coroutine cannot run again. |

`co.reset()` sets the status back to `uncalled`, so `start` can run the function again.

## Errors

A call in the wrong status throws one of these errors, all exported from the package:

| Call     | `uncalled`                     | `running`                   | `suspended`                | `dead`                     |
| -------- | ------------------------------ | --------------------------- | -------------------------- | -------------------------- |
| `start`  | runs                           | `CoroutineMultiStartError`  | `CoroutineMultiStartError` | `CoroutineDeadStartError`  |
| `resume` | `CoroutineUncalledResumeError` | `CoroutineMultiResumeError` | runs                       | `CoroutineDeadResumeError` |
| `yield`  | `CoroutineUncalledYieldError`  | runs                        | `CoroutineMultiYieldError` | `CoroutineDeadYieldError`  |

`start`, `resume` and `yield` are async, so the error comes as a rejected promise.

## TypeScript

The result and argument types come from the function:

```ts
const co = new Coroutine(async function (x: number) {
  const [y] = await this.yield(x * 2);
  return `${x} ${String(y)}`;
});

co.start(1); // start takes a number
const result = await co.resume('a');

if (result.done) {
  result.value; // string, the return value
} else {
  result.value; // unknown[], the yielded values
}
```

The values from `yield` and `resume` are typed `unknown[]`. Check them before use.

## `Coroutine.yield` and `Coroutine.current`

`Coroutine.yield(...values)` yields the coroutine that is running now, and `Coroutine.current` returns it. Outside a coroutine, `Coroutine.yield` throws.

The running coroutine is kept on a stack, not in an async context. After an `await`, another coroutine may have started, and both then point at the wrong coroutine. Use them only when one coroutine runs at a time. Otherwise, call `this.yield()` or `yield` on the coroutine itself.

## Differences from Lua coroutines

- `start`, `resume` and `yield` are methods on the coroutine, not functions in a `coroutine` table.
- They return promises, so the caller awaits them.
- Values passed through `yield` and `resume` arrive as one array, not as several return values.
- `Coroutine.current` is like `coroutine.running`, with the stack limit above.

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
