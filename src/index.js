const uuid = require('uuid/v4')
const { once } = require('events')

const Client = require('socket.io-client')
const Server = require('socket.io')

class AtHome {
  constructor({ id = uuid(), log = () => {} } = {}) {
    this.id = id
    this.ability = {}
    this.processers = {}
    this.ports = {}
    this.inbounds = {}
    this.outbounds = {}
    this.log = log
    this.log('Initialized', this.id)
  }
  connect({ target, protocol = 'ws', id = uuid() }) {
    let inbound = new Inbound({ target, protocol, id, log: this.log }, this)
    this.inbounds[id] = inbound
    this.log('Inbound Initialized', protocol, target, id)
  }
  open({ target, protocol = 'ws', id = uuid() }) {
    let port = new Port({ target, protocol, id, log: this.log }, this)
    this.ports[id] = port
    this.log('Port Open', protocol, target, id)
  }
  async bubble(name, data) {
    let inboundList = Object.keys(this.inbounds)
    for (let i = 0; i < inboundList.length; i++) {
      let id = inboundList[i]
      this.inbounds[id].dispatch({ name, data })
    }
  }
  register({ name, id, port }) {
    if (Object.keys(this.processers[name] || {}).includes(id)) {
      return 'arc'
    }
    if (!this.ability[name]) {
      this.ability[name] = { processers: new Set(), ports: {} }
    }
    if (!this.ability[name].ports[port.id]) {
      this.ability[name].ports[port.id] = new Set()
    }

    if (!this.ability[name].processers.has(id)) {
      this.ability[name].processers.add(id)
      this.bubble('register', { name, id })
    }
    this.ability[name].ports[port.id].add(id)
  }
  processer({ name, processer, id = uuid(), route = [] }) {
    this.log('Register', name, id)
    if (!this.processers[name]) {
      this.processers[name] = {}
    }
    this.processers[name][id] = processer
    return this.bubble('register', { name, id })
  }
  get registered() {
    let processers = Object.keys(this.processers)
      .map(name => ({ name, ids: Object.keys(this.processers[name]) }))
      .map(({ name, ids }) => ids.map(id => ({ name, id })))
    let abilities = Object.keys(this.ability)
      .map(name => ({ name, ids: [...this.ability[name].processers] }))
      .map(({ name, ids }) => ids.map(id => ({ name, id })))
    return [].concat(...processers, ...abilities)
  }
}

class Inbound {
  constructor({ id, protocol, target, log, inboundId }, home) {
    this.id = id
    this.protocol = protocol
    this.target = target
    this.online = false
    this.log = log
    this.pendingDispatch = []
    this.home = home
    if (protocol === 'ws') {
      let socket = Client(target)
      this.socket = socket
      socket.on('connect', () => {
        log('Inbound Connect', id)
        this.login()
      })
    }
  }
  emit(event, data) {
    return new Promise(resolve => this.socket.emit(event, data, resolve))
  }
  dispatch({ name, data }) {
    if (this.online) {
      return this.emit(name, data)
    } else {
      this.pendingDispatch.push({ name, data })
    }
  }
  async login() {
    let message = await this.emit('authenticate', { id: this.home.id, registered: this.home.registered })
    if (message === 'welcome') {
      this.online = true
      this.log('Inbound Online', this.id)
      for (let i = 0; i < this.pendingDispatch.length; i++) {
        this.dispatch(this.pendingDispatch[i])
      }
      this.pendingDispatch = []
    }
  }
}

class Port {
  constructor({ target, protocol, id, log }, home) {
    this.id = id
    this.ability = {}
    this.target = target
    this.home = home
    this.protocol = protocol
    this.log = log
    if (protocol === 'ws') {
      let io = new Server(target, { serveClient: false })
      this.io = io
      io.on('connect', socket => this.authenticate(socket))
    }
  }
  async authenticate(socket) {
    let [authenticate, arc] = await once(socket, 'authenticate')
    if (typeof arc !== 'function') {
      arc = () => {}
    }
    let outboundId = uuid()
    let { id, registered } = authenticate
    let outbound = new Outbound({ protocol: this.protocol, socket, log: this.log, home: id, id: outboundId, registered }, this)
    this.home.outbounds[outboundId] = outbound
    for (let i = 0; i < registered.length; i++) {
      this.register({ name: registered[i].name, id: registered[i].id, outbound })
    }
    arc('welcome')
    this.log('Outbound Online', outboundId, 'from', this.id)
  }
  register({ name, id, outbound }) {
    if (!this.ability[name]) {
      this.ability[name] = { processers: new Set(), outbounds: {} }
    }
    if (!this.ability[name].outbounds[outbound.id]) {
      this.ability[name].outbounds[outbound.id] = new Set()
    }

    if (!this.ability[name].processers.has(id)) {
      this.ability[name].processers.add(id)
      this.home.register({ name, id, port: this })
    }
    this.ability[name].outbounds[outbound.id].add(id)
  }
}

class Outbound {
  constructor({ protocol, socket, log, id, home }, port) {
    this.protocol = protocol
    this.socket = socket
    this.port = port
    this.log = log
    this.id = id
    this.home = home
    this.handler(socket)
  }
  handler(socket) {
    socket.on('register', ({ name, id }) => {
      this.port.register({ name, id, outbound: this })
    })
  }
}

module.exports = AtHome
