# AtHome [![npm](https://img.shields.io/npm/v/athome.svg)](https://www.npmjs.com/package/athome) [![Coverage Status](https://coveralls.io/repos/github/simon300000/athome/badge.svg?branch=master)](https://coveralls.io/github/simon300000/athome?branch=master)

#### *@Home*

#### Tiny and elegant Cluster state manager.

* Task pulling
* Result validation
* Error retries
* Simple status

## Install

```shell
npm install athome -S
```

## Usage

```javascript
const AtHome = require('.')
const home = new AtHome()

const clusterId = home.join((n, m) => n + m)
home.pull(clusterId)
// Since there is no tasks, this pull will be added to pulls waiting list.

home.execute(3, 4)
  .then(console.log) // => 7
```

More realistic use case:

```javascript
const AtHome = require('.')
const home = new AtHome()

const functionTakesLongLongTimeRunsFarFarAway = n => new Promise(resolve => setTimeout(() => resolve(n * n), 1000))

const clusterId = home.join(functionTakesLongLongTimeRunsFarFarAway)

home.execute(8).then(console.log)
// Since there is no pulls, the task will be added to waiting list

home.pull(clusterId)
// A second later, output 64
```

With built in validator:

```javascript
const AtHome = require('.')

const home = new AtHome({ validator: result => result > 0 })
// result must be greater than 0

const reverse = n => new Promise(resolve => setTimeout(() => resolve(-n), 1000))
const stay = n => new Promise(resolve => setTimeout(() => resolve(n), 1000))

const reverseId = home.join(reverse)
const stayId = home.join(stay)

home.pull(reverseId)
home.pull(reverseId)
home.pull(stayId)


home.execute(-3).then(console.log)
home.execute(2).then(console.log)

// First -3 will go throw 1st reverse pull and output 3,
// the second 2 will go throw 2nd reverse pull and output -2,
// which will falls the validation, so it will go again with the 3rd stay pull,
// and output 2, which pass the validation.
// output: 3, 2
```

## API Document

### new Athome(options)

| Options   | Type                        | Detail                             | Default      |
| --------- | --------------------------- | ---------------------------------- | ------------ |
| validator | Function => Promise/Boolean | A function used to validate result | `() => true` |
| retries   | Number                      | Max retries limit                  | `5`          |

### home.join(clusterFunction)

Add a cluster to @Home network.

`clusterFunction`: function will be called with all params when this cluster is executing task.

##### return: `String` cluster uuid

### home.pull(id)

Pull task for this cluster, the correspond `clusterFunction` will be called when there is task available.

`id`: clutser's uuid

### home.execute(...params)

Execute a task.

The task will be either executed now if there is waiting pulls, or added to task waiting list for pulls.

`params`: params which pass to `clusterFunction`

##### return: `Promise` resolve the result, or reject when retries too much.

### home.quit(id)

Remove a cluster from @Home network, this will also:

* remove the cluster from pulling list;
* fall all running task of this cluster;
  * which will then be handled by a different cluster;
  * (or reject task if the task reachs retries limit).

id`: cluster's uuid

## Contribution

Feel free to ask any question and create pull request.

But be sure to make the unit test.