const uuid = require('uuid/v4')
const { once } = require('events')

const Client = require('socket.io-client')
const Server = require('socket.io')

class AtHome {
  constructor({ id = uuid(), log = () => {} } = {}) {
    this.id = id
    this.ability = {}
    // this.upstream = {}
    // this.downstream = {}
    this.ports = {}
    this.inbounds = {}
    this.outbounds = {}
    this.log = log
    this.log('Initialized', this.id)
  }
  connect({ target, protocol = 'ws', id = uuid() }) {
    let inbound = new Inbound({ target, protocol, id, log: this.log }, {})
    this.inbounds[id] = inbound
    this.log('Inbound Initialized', protocol, target, id)
  }
  // updateBusy(name) {
  //   let busy = Object.keys(this.ability[name].outbounds)
  //     .map(id => this.ability[name].outbounds[id].busy)
  //     .reduce((a, b) => a && b)
  //   if (this.ability[name].busy !== busy) {
  //     this.ability[name].busy = busy
  //   }
  // }
  open({ target, protocol = 'ws', id = uuid() }) {
    let port = new Port({ target, protocol, id, log: this.log }, this)
    this.ports[id] = port
    this.log('Port Open', protocol, target, id)
  }
}

class Inbound {
  constructor({ id, protocol, target, log }) {
    this.id = id
    this.protocol = protocol
    this.target = target
    this.online = false
    this.log = log
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
  async login() {
    let message = await this.emit('authenticate', { id: this.id })
    if (message === 'welcome') {
      this.online = true
      this.log('Inbound Online', this.id)
    }
  }
}

class Port {
  constructor({ target, protocol, id, log }, node) {
    this.id = id
    this.ability = {}
    this.target = target
    this.node = node
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
    let { id } = authenticate
    let outbound = new Outbound({ protocol: this.protocol, socket })
    this.node.outbounds[id] = outbound
    arc('welcome')
    this.log('Outbound Online', id, 'from', this.id)
  }
}

class Outbound {
  constructor({ protocol, socket }) {
    this.protocol = protocol
    this.socket = socket
  }
}

module.exports = AtHome
