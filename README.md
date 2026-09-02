# Port Peer

A RPC-like facility for making inter-thread function calls.

## Introduction

Port Peer provides a simple and intuitive interface that makes inter-thread function calls _easy_. Please see the [Usage](#usage) or [Examples](#examples) for instructions on how to use Port Peer in your application.

### Features

- Bi-directional inter-thread function calls.
- Port Peer will marshal the return value or `Error` from the _other_ thread back to the caller.
- The _other_ thread may be the main thread or a worker thread.
- Registered functions (i.e., `peer.register`) persist until deregistered (i.e., `peer.deregister`) .
- Late binding registrants will be called with previously awaited invocations.

## Table of contents

- [Installation](#installation)
- [Concepts](#concepts)
- [Usage](#usage)
- [Examples](#examples)
- [API](#api)
- [Versioning](#versioning)
- [Tests](#tests)
- [Notes](#notes)
- [Support](#support)

## Installation

```bash
npm install port-peer --save
```

## Concepts

### Peer

An instance of a `Peer` facilitates bi-directional communication between threads. The `Peer` can be used in order to register a function in one thread and call it from another thread. Calls may be made from the main thread to a worker thread, and conversely from a worker thread to the main thread.

Late binding registrants will be called with previously awaited invocations; thus preventing a race condition. This means that you may await a call to a function that has not yet been registered. Once the function is registered in the _other_ thread it will be called and its return value or `Error` will be marshalled back to the caller.

Please see the [Examples](#examples) for variations on the `Peer`'s usage.

## Usage

### How to create a Peer instance

#### Import the Peer class and relevant dependencies.

```ts
import { Worker, parentPort } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { Peer } from "port-peer";
```

#### You can create a new Peer by passing a MessagePort or Worker instance to the Peer constructor.

In the main thread,

```ts
const worker = new Worker(fileURLToPath(import.meta.url));
const peer = new Peer(worker);
```

or, in a worker thread,

```ts
const peer = new Peer(parentPort);
```

### How to use a Peer instance

#### You can register a function in the main thread or in a worker thread using the `peer.register` method.

```ts
peer.register("hello_world", (value: string): string => `Hello, ${value} world!`);
```

#### You can call a function registered in another thread (i.e., the main thread or a worker thread) using the `peer.call` method:

```ts
const greeting = await peer.call<string>("hello_world", "happy");
console.log(greeting); // Hello, happy world!
```

## Examples

### _A simple example_ <sup><sup>\</Node.js\></sup></sup>

Please see the [simple example](https://github.com/adamjpatterson/port-peer/tree/main/examples/simple) for a working implementation.

### _A comprehensive example_ <sup><sup>\</TypeScript\></sup></sup>

Please see the [comprehensive example](https://github.com/adamjpatterson/port-peer/tree/main/examples/comprehensive) for a working implementation.

## API

### The Peer class

#### new Peer(port)

- port `<threads.MessagePort>` or `<threads.Worker>` The message port.

_public_ **peer.call\<T\>(name, ...args)**

- name `<string>` The name of the registered function.
- ...args `<Array<unknown>>` Arguments to be passed to the registered function.

Returns: `<Promise<T>>`

##### Errors

- If the registered function in the _other_ thread throws or rejects, the failure reason will be marshalled back from the _other_ thread to _this_ thread and the `Promise` will reject with that value as its failure reason.
- Rejection reasons may be any value supported by the underlying `MessagePort` structured-clone operation, including `Error` objects, strings, numbers, `false`, `null`, and `undefined`. Callers should not assume that a rejection reason is an `Error`.
- When an `Error` is marshalled, its standard error information is transferred according to the platform's structured-clone behavior. Error identity, custom prototypes, and custom properties are not guaranteed to be preserved.

###### Worker lifecycle

- If a worker thread throws an unhandled exception while a call is awaited, the `Error` will be marshalled back from the _other_ thread to _this_ thread and the `Promise` will reject with the unhandled exception as its failure reason.
- If a worker exits while a call is awaited, the `Promise` will reject with the worker's exit code as its failure reason.

_public_ **peer.register(name, fn)**

- name `<string>` The name of the registered function.
- fn `<(...args: Array<any>) => any>` The registered function.

Returns: `<void>`

_public_ **peer.deregister(name)**

- name `<string>` The name of the registered function.

Returns: `<void>`

## Versioning

The Port Peer package adheres to semantic versioning. Breaking changes to the public API will result in a turn of the major. Minor and patch changes will always be backward compatible.

Excerpted from [Semantic Versioning 2.0.0](https://semver.org/):

> Given a version number MAJOR.MINOR.PATCH, increment the:
>
> 1. MAJOR version when you make incompatible API changes
> 2. MINOR version when you add functionality in a backward compatible manner
> 3. PATCH version when you make backward compatible bug fixes
>
> Additional labels for pre-release and build metadata are available as extensions to the MAJOR.MINOR.PATCH format.

## Tests

### How to run the test suite

#### Clone the repository.

```bash
git clone https://github.com/adamjpatterson/port-peer
```

#### Change directory into the root of the repository.

```bash
cd port-peer
```

#### Install Port Peer dependencies.

```bash
npm install
```

#### Run the tests.

```bash
npm test
```

#### Run linting and tests together.

```bash
npm run check
```

#### Run the optional peer soak test.

The normal test suite includes deterministic concurrency and registration tests. A longer peer soak test is available but skipped by default.

On POSIX shells:

```bash
PORT_PEER_SOAK=1 npm test
```

On PowerShell:

```powershell
$env:PORT_PEER_SOAK = "1"; npm test
```

## Notes

### Support for broadcastChannels

Port Peer supports one to one communication over a `MessagePort`. `BroadcastChannel`s are not presently supported.

### Support for other communication channels

Port Peer is strictly focused on efficient communication over `MessagePort`s. Port Peer will not support communication over other communication channels e.g., `Socket`s, IPC, etc.

## Support

If you have a feature request or run into any issues, feel free to submit an [issue](https://github.com/adamjpatterson/port-peer/issues). You’re also welcome to reach out directly to one of the authors.

- [Adam Patterson](https://github.com/adamjpatterson)
