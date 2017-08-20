const config = require('config')
const mqtt = require('mqtt')
const Aqara = require('@svrooij/lumi-aqara')

// First setup the mqtt client.
const mqttConfig = config.get('mqtt')
var mqttOptions = {
  will: {
    topic: mqttConfig.topic + 'connected',
    message: 0,
    qos: 0,
    retain: true
  }
}

if (mqttConfig.user && mqttConfig.password) {
  mqttOptions.username = mqttConfig.user
  mqttOptions.password = mqttConfig.password
}

const mqttClient = mqtt.connect(mqttConfig.host, mqttOptions)

mqttClient.on('connect', () => {
  console.log('Connected to MQTT: %s', mqttConfig.host)
  publishConnectionStatus()
  mqttClient.subscribe(mqttConfig.topic + 'set/gateway/light')
})

mqttClient.on('message', (topic, message) => {
  var lastPart = topic.substr(topic.indexOf('/') + 1)
  switch (lastPart) {
    case 'set/gateway/ligth':
      handleGatewayLightUpdate(message)
      break
  }
})

function handleGatewayLightUpdate (message) {
  if (!lastGateway) return
    // TODO send message to gateway.
  console.log('Updating gateway light')
  if (IsNumeric(message)) {
    var value = parseInt(message)
    if (value >= 0 && value <= 100) {
      lastGateway.setIntensity(value)
    } else {
      console.warning(`Value: ${value} not valid intensity!`)
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
  mqttClient.publish(mqttConfig.topic + 'connected', status, {
    qos: 0,
    retain: true
  })
}

function publishDeviceData (device, newState) {
  const data = {
    val: newState, // Using val according to the MQTT Smarthome specs. State will be removed soon.
    state: newState,
    battery: Math.round(device.getBatteryPercentage()),
    name: getFriendlyName(device.getSid()),
    ts: Date.now()
  }
  var topic = `${mqttConfig.topic}status/${device.getType()}/${device.getSid()}`
  console.log(`Publishing ${newState} to ${topic}`)
  mqttClient.publish(topic,
        JSON.stringify(data),
        {qos: 0, retain: true}
    )
}

// ******* Gateway stuff from here ******
var lastGateway = null
const gatewayConfig = config.get('gateway')
const aqara = new Aqara()
aqara.on('gateway', (gateway) => {
  console.log('Gateway discovered')
  lastGateway = gateway
  gateway.on('ready', () => {
    console.log('Gateway ready')
    publishConnectionStatus()
    if (gatewayConfig.password) {
      gateway.setPassword(gatewayConfig.password)
    }
  })

  gateway.on('offline', () => {
    lastGateway = gateway = null
    console.log('Gateway is offline')
    publishConnectionStatus()
  })

  gateway.on('subdevice', (device) => {
    console.log(`Device found: ${device.getSid()} (${device.getType()}) name: ${getFriendlyName(device.getSid())}`)
    // console.log(`  Battery: ${device.getBatteryPercentage()}%`)
    // console.log(`  Type: ${device.getType()}`)
    // console.log(`  SID: ${device.getSid()}`)
    switch (device.getType()) {
      case 'magnet':
        // console.log(`  Magnet (${device.isOpen() ? 'open' : 'close'})`)
        publishDeviceData(device, `${device.isOpen() ? 'open' : 'closed'}`)
        device.on('open', () => {
          // console.log(`${device.getSid()} is now open`)
          publishDeviceData(device, 'open')
        })
        device.on('close', () => {
          // console.log(`${device.getSid()} is now close`)
          publishDeviceData(device, 'closed')
        })
        break
      case 'switch':
        // console.log(`  Switch`)
        publishDeviceData(device, 'unknown')
        device.on('click', () => {
          // console.log(`${device.getSid()} is clicked`)
          publishDeviceData(device, 'clicked')
        })
        device.on('doubleClick', () => {
          // console.log(`${device.getSid()} is double clicked`)
          publishDeviceData(device, 'doubleClicked')
        })
        device.on('longClickPress', () => {
          // console.log(`${device.getSid()} is long pressed`)
          publishDeviceData(device, 'pressed')
        })
        device.on('longClickRelease', () => {
          // console.log(`${device.getSid()} is long released`)
          publishDeviceData(device, 'released')
        })
        break
    }
  })

  gateway.on('lightState', (state) => {
    console.log(`Light updated: ${JSON.stringify(state)}`)
    const data = {
      state: state,
      ts: Date.now()
    }
    mqttClient.publish(`${mqttConfig.topic}status/gateway/light`,
        JSON.stringify(data),
        {qos: 0, retain: true})
  })
})

// Usefull function
function IsNumeric (val) {
  return Number(parseFloat(val)) === val
}

function getFriendlyName (deviceId) {
  if (gatewayConfig.devices && gatewayConfig.devices[deviceId]) {
    return gatewayConfig.devices[deviceId]
  }
  return null
}
