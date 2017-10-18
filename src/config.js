const config = require('yargs')
    .env('XIAOMI2MQTT')
    .usage('Usage: $0 [options]')
    .describe('d', 'File location of device list.')
    .describe('g', 'Gateway password (to enable gateway light change)')
    .describe('h', 'Show this help')
    .describe('l', 'possiblevalues: "error", "warn","info","debug"')
    .describe('m', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect-using-a-url')
    .describe('n', 'instance name. used as mqtt client id and as topic prefix')
    .alias({
      d: 'devices',
      g: 'password',
      h: 'help',
      l: 'logging',
      m: 'mqtt',
      n: 'name'
    })
    .default({
      l: 'info',
      m: 'mqtt://127.0.0.1',
      n: 'xiaomi'
    })
    .version()
    .help('help')
    .argv

module.exports = config
