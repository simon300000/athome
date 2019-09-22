const uuid = require('uuid/v4')

class AtHome {
  id: any
  nodes: Map<any, any>
  power: any
  validator: (...any) => Promise<Boolean>
  pulls: Array<any>
  pending: Array<any>
  constructor({ id = uuid(), validator = async () => true } = {}) {
    this.id = id
    this.nodes = new Map()
    // this.busy = []
    this.power = 0
    this.validator = validator
    this.pulls = []
    this.pending = []
  }
  join(processer, { id = uuid(), power = 1 } = {}) {
    this.nodes.set(id, { id, processer, resolve: 0, reject: 0, power, time: Date.now(), tasks: new Map() })
    // this.busy.push(...Array(power).fill(id))
    this.power += power
    return id
  }
  quit(id) {
    const { power, tasks } = this.nodes.get(id)
    // this.busy = this.busy.filter(node => node !== id)
    this.pulls = this.pulls.filter(({ id: node, reject }) => {
      if (node === id) {
        reject('quit')
        return false
      }
      return true
    })
    tasks.forEach(({ reject }) => reject())
    this.power -= power
    this.nodes.delete(id)
  }
  // async dispatch(id, task) {
  //   let node = this.nodes.get(id)
  //   this.nodes.set(id, { ...node, time: Date.now() })
  //   const result = await node.processer(task)
  //   const valid = await this.validator(result)
  //   if (!valid) {
  //     throw new Error('invalid')
  //   }
  //   node = this.nodes.get(id)
  //   this.nodes.set(id, { ...node, resolve: node.resolve + 1 })
  //   return result
  // }
  async execute(task, fails = []) {
    if (this.pulls.length) {

    } else {
      this.pending
    }
  }
  // pull(id) {
  //   if (this.nodes.has(id)) {
  //     return new Promise((resolve, reject) => {
  //       this.pulls.push({ id, resolve, reject })
  //       if (this.pending.length) {
  //         const task = this.pending.shift()
  //       }
  //     })
  //   } else {
  //     return Promise.reject(new Error('unknow node'))
  //   }
  // }
  // choice() {
  //   const waitList = this.busy
  //     .map(id => this.nodes.get(id))
  //     .sort(({ time: a }, { time: b }) => a - b)
  //     .map((node, index) => {
  //       const { resolve, reject } = node
  //       return { ...node, p: pdf(index / this.busy.length) * (resolve + 1) / ((resolve + 1) + (reject + 1)) }
  //     })
  //     .sort(({ p: a }, { p: b }) => b - a)
  //   const pSum = waitList.reduce(({ p: a }, { p: b }) => ({ p: a + b }), { p: 0 }).p
  //   let pFind = Math.random() * pSum
  //   return waitList.find(({ p }) => {
  //     pFind -= p
  //     if (pFind <= 0) {
  //       return true
  //     }
  //   }).id
  // }
  // async action(task, fails = []) {
  //   if (fails.length > 5) {
  //     throw fails
  //   }
  //   const id = this.choice()
  //   const result = await this.dispatch(task, id).catch(e => {
  //     const node = this.nodes.get(id)
  //     this.nodes.set(id, { ...node, reject: node.reject + 1 })
  //     return this.act(task, [...fails, e])
  //   })
  //   return result
  // }
}

module.exports = AtHome
