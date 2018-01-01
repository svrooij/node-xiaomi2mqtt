# Xiaomi2mqtt

[![npm](https://img.shields.io/npm/v/xiaomi2mqtt.svg?style=flat-square)](https://www.npmjs.com/package/xiaomi2mqtt)
[![travis](https://img.shields.io/travis/svrooij/xiaomi2mqtt.svg?style=flat-square)](https://travis-ci.org/svrooij/xiaomi2mqtt)
[![Support me on Patreon][badge_patreon]][patreon]
[![PayPal][badge_paypal_donate]][paypal-donations]
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

This node.js application is a bridge between the [Xiaomi Smart Home Gateway Aquara](https://xiaomi-mi.com/mi-smart-home/xiaomi-mi-gateway-2/) and a mqtt server. The statuses off all the (sub)devices (door magnets & buttons) connected to this gateway will be published to the mqtt server.

It's intended as a building block in heterogenous smart home environments where an MQTT message broker is used as the centralized message bus. See [MQTT Smarthome on Github](https://github.com/mqtt-smarthome/mqtt-smarthome) for a rationale and architectural overview.

Check out the other bridges in the [software list](https://github.com/mqtt-smarthome/mqtt-smarthome/blob/master/Software.md)

## Installation

Using xiaomi2mqtt is really easy, but it requires at least [Node.js](https://nodejs.org/) v6 or higher. (This app is tested against v6 and v8).

`sudo npm install -g xiaomi2mqtt`

## Configure the gateway

Before you can actually use the Xiaomi gateway you'll have to configure it. You'll do this by setting the Mi Home application to `Chinese Mainland` (or else you cannot add the gateway).

### Enable local network mode

The gateway also needs to have Local network mode enabled. This can be done from within the application.
[How to enable network mode](https://github.com/svrooij/node-xiaomi2mqtt/wiki/Network-mode-iOS)

## Usage

```bash
Usage: xiaomi2mqtt [options]

Options:
  -d, --devices   File location of device list (must end with .json).
  -g, --password  Gateway password (to enable gateway light change)
  -h, --help      Show help
  -l, --logging   possiblevalues: "error", "warn","info","debug"
                  [default: "info"]
  -m, --mqtt      mqtt broker url. See https://github.com/svrooij/node-xiaomi2mqtt#mqtt-url
                  [default: "mqtt://127.0.0.1"]
  -n, --name      instance name. used as mqtt client id and as topic prefix
                  [default: "xiaomi"]
  --version       Show version number
```

### MQTT Url

Use the MQTT url to connect to your specific mqtt server. Check out [mqtt.connect](https://github.com/mqttjs/MQTT.js#connect) for the full description.

```
Connection without port (port 1883 gets used)
[protocol]://[address] (eg. mqtt://127.0.0.1)

Connection with port
[protocol]://[address]:[port] (eg. mqtt://127.0.0.1:1883)

Secure connection with username/password and port
[protocol]://[username]:[password]@[address]:[port] (eg. mqtts://myuser:secretpassword@127.0.0.1:8883)
```

### Device list

At this moment is seems impossible to retrieve the device name for all subdevices from the gateway. If you want to have decent names for your devices, you'll have to create a json file that looks like this, and tell xiaomi2mqtt to use it with the `-d [filename-here]` argument. [Apparently](https://github.com/svrooij/node-xiaomi2mqtt/issues/4#issuecomment-347706853) this file needs the be called `something.json`, because of the way it parses this file.

```JSON
{
  "device_id": "Nice name",
  "158d000aaa2888": "Bedroom window",
  "158d000aaa5b35": "Frontdoor"
}
```

## Topics

Every message starts with the instance name (specified with the `-n` argument), which defaults to `xiaomi` so we'll asume the default.

### Connect messages

This bridge uses the `xiaomi/connected` topic to send retained connection messages. Use this topic to check your if your hue bridge is still running.

- `0` or missing is not connected (set by will functionality).
- `1` is connected to mqtt, but not to the xiaomi hardware.
- `2` is connected to mqtt and xiaomi hardware. (ultimate success!)

### Status messages

The status of each device will be published to `xiaomi/status/[device_kind]/[device_id]` as a JSON object containing the following fields.
The temperature/humidity/pressure sensor will be published to three topics.

- `name` If you defined a name in the config.
- `battery` The calculated battery percentage of the sensor.
- `val` current state of the device.
  - For magnets this will contain `open` or `closed`.
  - For buttons this will contain `unknown`, `clicked`, `double_clicked`, `pressed` or `relesed`.
  - For motion sensors this will contain `motion` or `no_motion`.
  - For leak sensors this will contain `leaking` or `not_leaking`
- `ts` timestamp of last update.

Each status message is retained, so if you subscribe after a status message, you will always get the last status.

The statuses of the devices are multicasted over the network if you enbaled this (you SHOULD!!). So all the updates to mqtt are near instant.

### Setting the gateway light

You can control the gateway light (if you've set-up the gateway password) by sending a message to `xiaomi/set/gateway/light`, send one of these:

- a single brightness value. (Number between 0 and 100, 0 for off)
- a json object containing (some of) the following properties:
  - `intensity` brightness (0-100) (0 = off)
  - `color` as json containing all 3 colors. `{ "r": 0-255, "g": 0-255, "b": 0-255 }`

```json
// Sending this will result in a red light at 40% brightness
{
  "intensity": 40,
  "color": {"r":255,"g":0,"b":0}
}
```

## Use [PM2](http://pm2.keymetrics.io) to run in background

If everything works as expected, you should make the app run in the background automatically. Personally I use PM2 for this. And they have a great [guide for this](http://pm2.keymetrics.io/docs/usage/quick-start/).

## Special thanks

The latest version of this bridge is inspired on [hue2mqtt.js](https://github.com/hobbyquaker/hue2mqtt.js) by [Sabastian Raff](https://github.com/hobbyquaker). That was a great sample on how to create a globally installed, command-line, something2mqtt bridge.

## Beer

This bridge took me quite some time, so I invite everyone using this bridge to [Buy me a beer](https://svrooij.nl/buy-me-a-beer/).

[badge_paypal_donate]: https://svrooij.nl/badges/paypal_donate.svg
[badge_patreon]: https://svrooij.nl/badges/patreon.svg
[paypal-donations]: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=T9XFJYUSPE4SG
[patreon]: https://www.patreon.com/svrooij
