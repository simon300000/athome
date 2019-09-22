/* global describe context it */
import { assert } from 'chai'
import AtHome = require('..')

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('@Home', function () {
  context('Class AtHome', function () {
    it('AtHome()', function () {
      return assert.isFunction(AtHome)
    })
    it('New', function () {
      const home = new AtHome()
      return assert.isObject(home)
    })
    it('preset id', function () {
      const random = String(Math.random())
      const home = new AtHome({ id: random })
      return assert.strictEqual(home.id, random)
    })
  })
  context('Nodes', function () {
    context('join', function () {
      it('id', function () {
        const home = new AtHome()
        const id = home.join(() => 233)
        return assert.isString(id)
      })
      it('preset id', function () {
        const home = new AtHome()
        const random = String(Math.random())
        const id = home.join(() => 233, { id: random })
        return assert.strictEqual(id, random)
      })
      it('power', function () {
        const home = new AtHome()
        home.join(() => 233)
        return assert.strictEqual(home.power, 1)
      })
      it('preset power', function () {
        const home = new AtHome()
        home.join(() => 233, { power: 20 })
        home.join(() => 233)
        return assert.strictEqual(home.power, 21)
      })
      it('list', function () {
        const home = new AtHome()
        home.join(() => 233)
        return assert.strictEqual(home.homes.size, 1)
      })
      // it('busy', function() {
      //   const home = new AtHome()
      //   home.join(() => 233)
      //   return assert.strictEqual(home.busy.length, 1)
      // })
      // it('busy with power', function() {
      //   const home = new AtHome()
      //   home.join(() => 233, { power: 20 })
      //   return assert.strictEqual(home.busy.length, 20)
      // })
    })
    context('quit', function () {
      it('quit', function () {
        const home = new AtHome()
        const id = home.join(() => 233)
        home.quit(id)
        return assert.equal(home.homes.size, 0)
      })
      it('quit with job', async function () {
        const home = new AtHome()
        let id
        const result = home.execute(undefined).catch((e: Error) => e)
        for (let index = 0; index < 6; index++) {
          id = home.join(() => new Promise(() => { }))
          home.pull(id)
          home.quit(id)
          await wait(1)
        }
        return assert.instanceOf(await result, Error)
      })
    })
    context('Compute', function () {
      it('pull and execute', async function () {
        const home = new AtHome()
        const id = home.join(() => 233)
        home.pull(id)
        const result = await home.execute(undefined)
        return assert.equal(result, 233)
      })
      it('execute and pull ', async function () {
        const home = new AtHome()
        const id = home.join(() => 233)
        const result = home.execute(undefined)
        home.pull(id)
        return assert.equal(await result, 233)
      })
    })
  })
  // context('Action', function() {
  // it('compute', async function() {
  //   let number = 42
  //   const home = new AtHome()
  //   home.join(n => n + 1)
  //   return assert.strictEqual(await home.action(number), number + 1)
  // })
  // })
})
