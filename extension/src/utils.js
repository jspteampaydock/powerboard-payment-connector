import bunyan from 'bunyan'
import {serializeError} from 'serialize-error'
import {fileURLToPath} from 'url'
import path from 'path'
import fs from 'node:fs/promises'
import config from './config/config.js'

let logger

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


async function addPowerboardHttpLog(data) {
    const logKey = `powerboard-http_${Date.now()}`;

    const logObject = {
        container: "powerboard-http-logs",
        key: logKey,
        value: data
    };
    const ctpClient = await config.getCtpClient()
    ctpClient.create(
        ctpClient.builder.customObjects,
        JSON.stringify(logObject)
    )
}


function collectRequestData(request) {
    return new Promise((resolve) => {
        const data = []

        request.on('data', (chunk) => {
            data.push(chunk)
        })

        request.on('end', () => {
            const dataStr = Buffer.concat(data).toString()
            if (dataStr) {
                this.addPowerboardHttpLog(JSON.parse(dataStr));
            }
            resolve(dataStr)
        })
    })
}

function sendResponse({response, statusCode = 200, headers, data}) {
    response.writeHead(statusCode, headers)
    response.end(JSON.stringify(data))
}

function getLogger() {
    if (!logger)
        logger = bunyan.createLogger({
            name: 'ctp-powerboard-integration-extension',
            stream: process.stderr,
            level: config.getModuleConfig().logLevel || bunyan.INFO,
        })
    return logger
}

function handleUnexpectedPaymentError(paymentObj, err) {
    const errorMessage =
        '[powerboard-pay-integration-extension] ' +
        `Unexpected error (Payment ID: ${paymentObj?.id}): ${err.message}.`
    const errorStackTrace = `Unexpected error (Payment ID: ${
        paymentObj?.id
    }): ${JSON.stringify(serializeError(err))}`
    getLogger().error(errorStackTrace)
    return {
        errors: [
            {
                code: 'General',
                message: errorMessage,
            },
        ],
    }
}

async function readAndParseJsonFile(pathToJsonFileFromProjectRoot) {
    const currentFilePath = fileURLToPath(import.meta.url)
    const currentDirPath = path.dirname(currentFilePath)
    const projectRoot = path.resolve(currentDirPath, '..')
    const pathToFile = path.resolve(projectRoot, pathToJsonFileFromProjectRoot)
    const fileContent = await fs.readFile(pathToFile)
    return JSON.parse(fileContent)
}

export default {
    collectRequestData,
    sendResponse,
    getLogger,
    addPowerboardHttpLog,
    handleUnexpectedPaymentError,
    readAndParseJsonFile,
    addPowerboardLog
}
