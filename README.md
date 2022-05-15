# AtHome [![npm](https://img.shields.io/npm/v/athome.svg)](https://www.npmjs.com/package/athome) [![Coverage Status](https://coveralls.io/repos/github/simon300000/athome/badge.svg?branch=master)](https://coveralls.io/github/simon300000/athome?branch=master) ![Node CI](https://github.com/simon300000/athome/workflows/Node%20CI/badge.svg)

#### *@Home*

#### Tiny and elegant Cluster state manager.

* Task pulling
* Error retries
* Built in status

## Install

```shell
npm install athome -S
```

## Usage

```javascript
const AtHome = require('athome')
const atHome = new AtHome()

const clusterId = atHome.join()
atHome.pull(clusterId)
  .then(({ resolve, data: [a, b] }) => resolve(a + b))
// Since there is no tasks, this pull will be added to pulls waiting list.

atHome.execute([3, 4])
  .then(console.log) // => 7
```

More realistic use case:

```javascript
const AtHome = require('athome')
const atHome = new AtHome()

const functionTakesLongLongTimeRunsFarFarAway = n => new Promise(resolve => setTimeout(() => resolve(n * n), 1000))

const clusterId = atHome.join(functionTakesLongLongTimeRunsFarFarAway)

atHome.execute(8).then(console.log)
// Since there is no pulls, the task will be added to waiting list

atHome.pull(clusterId)
// A second later, output 64
```

## API Document

### new Athome(options)

return atHome instance

| Options | Type                        | Detail                             | Default      |
| ------- | --------------------------- | ---------------------------------- | ------------ |
| retries | Number                      | Max retries limit                  | `5`          |

#### atHome.join()

Add a cluster to @Home network

##### return: `String` HomeID, cluster id

#### atHome.pull(id)

Pull task for this cluster

`id`: clutser's uuid

**return: `Promise<{resolve, reject, data}>`**

#### atHome.execute(data)

Execute a task

The task will be either executed now if there is waiting pulls, or added to task waiting list for pulls.

`data`: input for `pull()`

##### return: `Promise` resolve the result, or reject when retries too much.

#### atHome.quit(id)

Remove a cluster from @Home network, this will also:

* remove the cluster from pulling list;
* fall all running task of this cluster;
  * which will then be handled by a different cluster;
  * (or reject task if the task reachs retries limit).

`id`: cluster's uuid

#### atHome.homes: `Map<HomeID, Home>`

Map with HomeID(uuid) and Home Instances.

### Home Instance

#### home.id `HomeID(uuid)`

#### home.resolves `number`

Number of resolves.

#### home.rejects `number`

Number of rejects, include invalid response.

#### home.lastSeen `number`

Time stamp, refresh when:

* join
* pull
* finish task
