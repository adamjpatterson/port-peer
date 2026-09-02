# A Simple Example

## Introduction

This example provides a simple demonstration of Port Peer's functionality.

## Implement the example

### Procedure

#### In this example you will:

1. Instantiate a worker thread.
2. Instantiate a `Peer` in the main thread.
3. Use the `Peer` to await a call to the `hello_world` function.
4. Instantiate a `Peer` in the worker thread.
5. Use the `Peer` in order to register a function named `abend` that will throw an `Error` when it is called.
6. Use the `Peer` in order to register a function named `hello_world` to handle calls to the `hello_world` function.
7. Use the `Peer` in order to register a function named `add` that will return the sum of two operands.
8. Resolve (3) and log the `greeting` to the console.
9. Use the `Peer` to await a call to the function named `add`.
10. Resolve (9) and log the `result` to the console.
11. Use the `Peer` to await a call to the function named `abend`.
12. Catch the failure reason from (11) and log it to the console.
13. Terminate the thread.

### Implement the `index.js` module

```js
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { Peer } from "@far-analytics/port-peer";

if (isMainThread) {
  // This is the main thread.
  void (async () => {
    const worker = new Worker(fileURLToPath(import.meta.url)); // (1)
    const peer = new Peer(worker); // (2)
    try {
      const greeting = await peer.call("hello_world", "another"); // (3)
      console.log(greeting); // (8)

      const result = await peer.call("add", 1, 1); // (9)
      console.log(result); // (10)

      await peer.call("abend", "This Error is expected, indeed."); // (11)
    } catch (err) {
      console.error(err); // (12)
    } finally {
      worker.terminate(); // (13)
    }
  })();
} else {
  // This is a worker thread.
  if (parentPort) {
    const peer = new Peer(parentPort); // (4)
    peer.register("abend", (message) => {
      throw new Error(message);
    }); // (5)
    peer.register("hello_world", (value) => `Hello, ${value} world!`); // (6)
    peer.register("add", (a, b) => a + b); // (7)
  }
}
```

## Run the example

### How to run the example

#### Clone the Port Peer repo.

```bash
git clone https://github.com/adamjpatterson/port-peer.git
```

#### Change directory into the relevant example directory.

```bash
cd port-peer/examples/simple
```

#### Install the example dependencies.

```bash
npm install
```

#### Run the application.

```bash
npm start
```

##### Output (stack trace abbreviated)

```bash
Hello, another world!
2
Error: This Error is expected, indeed.
    ... stack trace omitted ...
```
