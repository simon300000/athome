const uuidv4 = require('uuid/v4')
const uuid = () => String(uuidv4())

class Task {
  data: any[]
  id: string
  promise: Promise<any>
  resolve: (result: any) => void
  reject: (error: Error) => void
  falls: Array<Error>
  constructor({ data, falls = [] }: { data: any[], falls?: Array<Error> }) {
    this.falls = falls
    this.data = data
    this.id = uuid()
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

class Job {
  id: string
  task: Task
  resolve: (result: any) => void
  reject: (error: Error) => void
  promise: Promise<any>
  constructor(id: string, task: Task) {
    this.id = id
    this.task = task
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

class Home {
  id: string
  processer: (...data: any[]) => any
  resolve: number
  reject: number
  power: number
  // time: number
  jobs: Set<Job>
  constructor({ processer, id, power }: { id: string, processer: (...data: any[]) => any, power: number }) {
    this.id = id
    this.processer = processer
    this.resolve = 0
    this.reject = 0
    this.power = power
    // this.time = Date.now()
    this.jobs = new Set()
  }
}

class Pull {
  id: string
  promise: Promise<Task>
  resolve: (task: Task) => void
  constructor(id: string) {
    this.id = id
    this.promise = new Promise(resolve => {
      this.resolve = resolve
    })
  }
}

export = class AtHome {
  id: string
  homes: Map<string, Home>
  power: number
  private validator: (result?: any) => Boolean | Promise<Boolean>
  private pulls: Array<Pull>
  private pending: Array<Task>
  constructor({ id = uuid(), validator = (result?: any): boolean | Promise<boolean> => true } = {}) {
    this.id = id
    this.homes = new Map()
    // this.busy = []
    this.power = 0
    this.validator = validator
    this.pulls = []
    this.pending = []
  }
  join = (processer: (...data: any[]) => any, { id = uuid(), power = 1 } = {}) => {
    this.homes.set(id, new Home({ processer, id, power }))
    // this.busy.push(...Array(power).fill(id))
    this.power += power
    return id
  }
  quit = (id: string) => {
    const { power, jobs } = this.homes.get(id)
    // this.busy = this.busy.filter(node => node !== id)
    this.pulls = this.pulls.filter(pull => pull.id !== id)
    jobs.forEach(({ reject }) => reject(new Error('quit')))
    this.power -= power
    this.homes.delete(id)
  }
  private transmit = async (id: string, job: Job) => {
    const home = this.homes.get(id)
    if (!home) {
      throw new Error('unknow home')
    }
    home.jobs.add(job)
    const result = await home.processer(...job.task.data)
    //   this.nodes.set(id, { ...node, time: Date.now() })
    const valid = await this.validator(result)
    if (!valid) {
      throw new Error('invalid')
    }
    //   node = this.nodes.get(id)
    //   this.nodes.set(id, { ...node, resolve: node.resolve + 1 })
    return result
  }
  private dispatch = async (id: string, task: Task) => {
    const job = new Job(id, task)
    this.transmit(id, job).then(job.resolve).catch(job.reject)
    job.promise
      .then(result => {
        task.resolve(result)
      })
      .catch((e: Error) => {
        task.falls.push(e)
        if (task.falls.length > 5) {
          task.reject(new Error(task.falls.map(({ message }) => message).join(', ')))
        } else {
          if (this.pulls.length) {
            const pull = this.pulls.shift()
            pull.resolve(task)
          } else {
            this.pending.unshift(task)
          }
        }
      })
      .finally(() => {
        const home = this.homes.get(id)
        if (home) {
          home.jobs.delete(job)
        }
      })
  }
  execute = (...data: any[]): Promise<any> => {
    const task = new Task({ data })
    if (this.pulls.length) {
      const pull = this.pulls.shift()
      pull.resolve(task)
      return task.promise
    } else {
      this.pending.push(task)
      return task.promise
    }
  }
  pull = (id: string): Promise<any> => {
    if (this.homes.has(id)) {
      const pull = new Pull(id)
      if (this.pending.length) {
        const task = this.pending.shift()
        pull.resolve(task)
      } else {
        this.pulls.push(pull)
      }
      return pull.promise.then(task => this.dispatch(pull.id, task))
    } else {
      return Promise.reject(new Error('unknow node'))
    }
  }
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
