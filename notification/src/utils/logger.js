import bunyan from 'bunyan'
import config from '../config/config.js'

const {logLevel} = config.getModuleConfig()

let obj

function getLogger() {
    if (obj === undefined) {
        const NOTIFICATION_MODULE_NAME = 'ctp-powerboard-integration-notifications'
        obj = bunyan.createLogger({
            name: NOTIFICATION_MODULE_NAME,
            stream: process.stdout,
            level: logLevel || bunyan.INFO,
            serializers: {
                err: bunyan.stdSerializers.err,
                cause: bunyan.stdSerializers.err,
            },
        })
    }
    return obj
}

async function addPowerboardHttpLog(data) {
    const logKey = `powerboard-notification-http_${Date.now()}`;

    const logObject = {
        container: "powerboard-notification-http-logs",
        key: logKey,
        value: data
    };
    const ctpClient = await config.getCtpClient()
    ctpClient.create(
        ctpClient.builder.customObjects,
        JSON.stringify(logObject)
    )
}

async function addPowerboardLog(data) {
    const logKey = `powerboard-log_${Date.now()}`;
    const logObject = {
        container: "powerboard-logs",
        key: logKey,
        value: data
    };

    const ctpClient = await config.getCtpClient()
    await ctpClient.create(
        ctpClient.builder.customObjects,
        JSON.stringify(logObject)
    )
}

export {getLogger, addPowerboardLog, addPowerboardHttpLog}
