# Xiaomi2mqtt

[![npm version](https://badge.fury.io/js/xiaomi2mqtt.svg)](https://badge.fury.io/js/xiaomi2mqtt)

This node.js application is a bridge between the [Xiaomi Smart Home Gateway Aquara](https://xiaomi-mi.com/mi-smart-home/xiaomi-mi-gateway-2/) and a mqtt server. The statuses off all the (sub)devices (door magnets & buttons) connected to this gateway will be published to the mqtt server.

It's intended as a building block in heterogenous smart home environments where an MQTT message broker is used as the centralized message bus. See [MQTT Smarthome on Github](https://github.com/mqtt-smarthome/mqtt-smarthome) for a rationale and architectural overview.

## Topics

Every message starts with a prefix (see [config](#config)) that defaults to `xiaomi`. So if you change this all the topics change.

## Connect messages

This bridge uses the `xiaomi/connected` topic to send retained connection messages. Use this topic to check your if your hue bridge is still running.

- `0` or missing is not connected (set by will functionality).
- `1` is connected to mqtt, but not to the xiaomi hardware.
- `2` is connected to mqtt and xiaomi hardware. (ultimate success!)

## Status messages

The status of each device will be published to `xiaomi/status/[device_kind]/[device_id]` as a JSON object containing the following fields. The temperature/humidity sensor will be published to two topics.

- `name` If you defined a name in the config.
- `val` current state of the device.
  - For magnets this will contain `open` or `closed`.
  - For buttons this will contain `unknown`, `clicked`, `double_clicked`, `pressed` or `relesed`.
  - For motion sensors this will be either `motion` or `no_motion`.
- DEPRECATED `state` also contains the state, but shouldn't be used anymore and will be removed soon.
- `ts` timestamp of last update.

Each status message is retained, so if you subscribe after a status message, you will always get the last status.

The statuses of the devices are multicasted over the network if you enbaled this (you SHOULD!!). So all the updates to mqtt are near instant.

## Setting the gateway light

You can control the gateway light (if you've set-up the password) by sending a message to `xiaomi/set/gateway/light`, send one of these:

- a single brightness value. (Number between 0 and 100, 0 for off)
- a json object containing (some of) the following properties:

  - `intensity` brightness (0-100) (0 = off)
  - `color` as json containing all 3 colors. `{ "r": 0-255, "g": 0-255, "b": 0-255 }`

```
// Sending this will result in a red light at 40% brightness
{
  "intensity": 40,
  "color": {"r":255,"g":0,"b":0}
}
```

## Config

Before you can actually use the Xiaomi gateway you'll have to configure it. You'll do this by setting the Mi Home application to `Chinese Mainland` (or else you cannot add the gateway).

### Enable local network mode

The gateway also needs to have Local network mode enabled. This can be done from within the application. 
[How to enable network mode](./network_mode/README.md)

### Installing everything

You would typically run this app in the background, but first you have to configure it. You should first install [Node.JS](https://nodejs.org/en/download/).

```bash
git clone https://github.com/svrooij/node-xiaomi2mqtt.git xiaomi2mqtt
cd xiaomi2mqtt
npm install
nano config/local.json
```

You are now in the config file. Enter the following data as needed. See [mqtt.connect](https://www.npmjs.com/package/mqtt#connect) for options how to format the host. `mqtt://ip_address:1883` is the easiest.

You can also define names for the sensors here. These will be used in the json that is published to the mqtt server.

```json
{
  "mqtt": {
    "host":"mqtt://127.0.0.1:1883",
    "user":null,
    "password":null
  },
  "gateway":{
      "password": "",
      "devices": {
        "device_sid":"Friendly Name"
      }
  }
}
```

## Start the application

Try to start the application by running `npm start` or directly by `node index.js`, and the topics should appear on your mqtt server.

## Use [PM2](http://pm2.keymetrics.io) to run in background

If everything works as expected, you should make the app run in the background automatically. Personally I use PM2 for this. And they have a great [guide for this](http://pm2.keymetrics.io/docs/usage/quick-start/).