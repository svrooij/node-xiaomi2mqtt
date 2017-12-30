const config = require('yargs')
    .env('XIAOMI2MQTT')
    .usage('Usage: $0 [options]')
    .describe('d', 'File location of device list (must end with .json).')
    .describe('g', 'Gateway password (to enable gateway light change)')
    .describe('h', 'Show this help')
    .describe('l', 'Logging level')
    .describe('m', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect-using-a-url')
    .describe('k', 'accept self singed-certificates when using TLS. See https://github.com/mqttjs/MQTT.js#mqttclientstreambuilder-options')
    .describe('n', 'instance name. used as mqtt client id and as topic prefix')
    .boolean('k')
    .alias({
      d: 'devices',
      g: 'password',
      h: 'help',
      l: 'logging',
      m: 'mqtt',
      k: 'insecure',
      n: 'name'
    })
    .choices('l', ['error', 'warn', 'info', 'debug'])
    .default({
      l: 'info',
      m: 'mqtt://127.0.0.1',
      k: false,
      n: 'xiaomi'
    })
    .version()
    .help('help')
    .wrap(null)
    .argv

module.exports = config
