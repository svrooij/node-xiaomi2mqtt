const log = require('yalm')
const config = require('./config.js')
const mqtt = require('mqtt')
const Aqara = require('lumi-aqara')
const pkg = require('../package.json')
const fs = require('fs')

let mqttClient
let lastGateway
let aqara
let devices

function start () {
  log.setLevel(config.logging)
  log._info(pkg.name + ' ' + pkg.version + ' starting')

  if (config.devices) {
    fs.access(config.devices, fs.constants.R_OK, (err) => {
      if (!err) {
        log.info('Loading devices from: ' + config.devices)
        try {
          devices = require(config.devices)
        } catch (e) {
          log.error('Error loading devices: ', e)
        }
      }
    })
  }

  const mqttOptions = {
    will: {
      topic: config.name + '/connected',
      message: 0,
      qos: 0,
      retain: true
    },
    rejectUnauthorized: !config.insecure
  }

  mqttClient = mqtt.connect(config.mqtt, mqttOptions)

  mqttClient.on('connect', () => {
    log.info('Connected to MQTT: %s', config.mqtt)
    publishConnectionStatus()
    mqttClient.subscribe(config.name + '/set/gateway/light')
  })

  mqttClient.on('message', (topic, message) => {
    var lastPart = topic.substr(topic.indexOf('/') + 1)
    switch (lastPart) {
      case 'set/gateway/light':
        handleGatewayLightUpdate(message)
        break
    }
  })

  mqttClient.on('close', () => {
    log.info('mqtt closed ' + config.mqtt)
  })

  mqttClient.on('error', err => {
    log.error('mqtt', err.toString())
  })

  mqttClient.on('offline', () => {
    log.error('mqtt offline')
  })

  mqttClient.on('reconnect', () => {
    log.info('mqtt reconnect')
  })

  aqara = new Aqara()
  aqara.on('gateway', (gateway) => {
    log.info('Gateway discovered')
    lastGateway = gateway
    gateway.on('ready', () => {
      log.info('Gateway ready')
      publishConnectionStatus()
      if (config.password) {
        gateway.setPassword(config.password)
      }
    })

    gateway.on('offline', () => {
      lastGateway = gateway = null
      log.warn('Gateway is offline')
      publishConnectionStatus()
    })

    gateway.on('subdevice', (device) => {
      log.debug(`Device found: ${device.getSid()} (${device.getType()}) name: ${getFriendlyName(device.getSid())}`)

      switch (device.getType()) {
        case 'magnet':
          publishMagnetState(device, `${device.isOpen() ? 'open' : 'closed'}`)
          device.on('open', () => {
            publishMagnetState(device, 'open')
          })
          device.on('close', () => {
            publishMagnetState(device, 'closed')
          })
          break
        case 'switch':
          publishDeviceData(device, 'unknown')
          device.on('click', () => {
            publishDeviceData(device, 'clicked')
          })
          device.on('doubleClick', () => {
            publishDeviceData(device, 'double_clicked')
          })
          device.on('longClickPress', () => {
            publishDeviceData(device, 'pressed')
          })
          device.on('longClickRelease', () => {
            publishDeviceData(device, 'released')
          })
          break
        case 'motion':
          publishDeviceData(device, `(${device.hasMotion() ? 'motion' : 'no_motion'})`, {lux: device.getLux()})
          device.on('motion', () => {
            publishDeviceData(device, 'motion', {lux: device.getLux()})
          })
          device.on('noMotion', () => {
            publishDeviceData(device, 'no_motion', { secondsSinceMotion: device.getSecondsSinceMotion(), lux: device.getLux() })
          })
          break
        case 'sensor':
          publishHTSensor(device)
          device.on('update', () => {
            publishHTSensor(device)
          })
          break
        case 'leak':
          publishDeviceData(device, `(${device.isLeaking() ? 'leaking' : 'not_leaking'})`)
          device.on('update', () => {
            publishDeviceData(device, `(${device.isLeaking() ? 'leaking' : 'not_leaking'})`)
          })
          break
        case 'cube':
          publishDeviceData(device, 'unknown')
          device.on('update', () => {
            publishDeviceData(device, device.getStatus(), {rotation: device.getRotateDegrees()})
          })
          break
      }
    })

    gateway.on('lightState', (state) => {
      log.info(`Light updated: ${JSON.stringify(state)}`)
      const data = {
        state: state,
        ts: Date.now()
      }
      mqttClient.publish(`${config.name}/status/gateway/light`,
          JSON.stringify(data),
          {qos: 0, retain: true})
    })
  })
}

function handleGatewayLightUpdate (message) {
  if (!lastGateway) return
    // TODO send message to gateway.
  log.info('Updating gateway light')
  if (IsNumeric(message)) {
    var value = parseInt(message)
    if (value >= 0 && value <= 100) {
      lastGateway.setIntensity(value)
    } else {
      log.warn(`Value: ${value} not valid intensity!`)
    }
  } else { // Not numeric
    const data = JSON.parse(message)
    // TODO do something with the data.
    lastGateway.setIntensity(data.intensity)
    lastGateway.setColor(data.color)
  }
}

function publishConnectionStatus () {
  var status = '1'
  if (lastGateway && lastGateway.ready) { status = '2' }
  mqttClient.publish(config.name + '/connected', status, {
    qos: 0,
    retain: true
  })
}

function publishDeviceData (device, newState, extraData = {}) {
  let data = {
    val: newState, // Using val according to the MQTT Smarthome specs.
    battery: device.getBatteryPercentage(),
    name: getFriendlyName(device.getSid()),
    ts: Date.now()
  }

  Object.assign(data, extraData)
  var topic = `${config.name}/status/${device.getType()}/${device.getSid()}`
  log.info(`Publishing ${newState} to ${topic}`)
  mqttClient.publish(topic,
        JSON.stringify(data),
        {qos: 0, retain: true}
    )
}

let magnets = []
function publishMagnetState (device, newState) {
  const magnetIndex = magnets.findIndex(function (m) { return m.id === device.getSid() })

  if (magnetIndex > -1) {
    if (magnets[magnetIndex].state === newState) {
      return
    } else {
      magnets[magnetIndex].state = newState
    }
  } else {
    magnets.push({id: device.getSid(), state: newState})
  }
  publishDeviceData(device, newState)
}

function publishHTSensor (sensorDevice) {
  const tempTopic = `${config.name}/status/temperature/${sensorDevice.getSid()}`
  const humTopic = `${config.name}/status/humidity/${sensorDevice.getSid()}`
  const presTopic = `${config.name}/status/pressure/${sensorDevice.getSid()}`
  let data = {
    val: sensorDevice.getTemperature(),
    battery: sensorDevice.getBatteryPercentage(),
    name: getFriendlyName(sensorDevice.getSid()),
    ts: Date.now()
  }
  mqttClient.publish(tempTopic,
    JSON.stringify(data),
    {qos: 0, retain: true}
  )
  data.val = sensorDevice.getHumidity()
  mqttClient.publish(humTopic,
    JSON.stringify(data),
    {qos: 0, retain: true}
  )

  let pressure = sensorDevice.getPressure()
  if (pressure !== null) {
    data.val = pressure
    mqttClient.publish(presTopic,
      JSON.stringify(data),
      {qos: 0, retain: true}
    )
  }
}

// Usefull function
function IsNumeric (val) {
  return Number(parseFloat(val)) === val
}

function getFriendlyName (deviceId) {
  if (devices && devices[deviceId]) {
    return devices[deviceId]
  }
  return null
}

start()
