import {serializeError} from 'serialize-error'
import httpUtils from '../../utils.js'

const logger = httpUtils.getLogger()

async function processRequest(request, response) {
    if (request.method !== 'POST') {
        logger.debug(
            `Received non-POST request: ${request.method}. The request will not be processed...`,
        )
        return httpUtils.sendResponse({
            response,
            statusCode: 400,
            data: {
                errors: [
                    {
                        code: 'InvalidInput',
                        message: 'Invalid HTTP method',
                    },
                ],
            },
        })
    }
    let orderObject = {}
    try {
        orderObject = await _getOrderObject(request)
        if (orderObject.orderNumber) {
            return httpUtils.sendResponse({response, statusCode: 200, data: {actions: []}})
        }
        const result = {
            response,
            statusCode: 200,
            data: {
                actions: [{
                    "action": "setOrderNumber",
                    "orderNumber": orderObject.id
                }]
            }
        }
        return httpUtils.sendResponse(result)
    } catch (err) {
        return httpUtils.sendResponse({response, statusCode: 200, data: {actions: []}})
    }
}

async function _getOrderObject(request) {
    let body = {}
    try {
        body = await httpUtils.collectRequestData(request)
        const requestBody = JSON.parse(body)
        return requestBody.resource.obj
    } catch (err) {
        const errorStackTrace =
            `Error during parsing CTP request:  Ending the process. ` +
            `Error: ${JSON.stringify(serializeError(err))}`
        logger.error(errorStackTrace)
        throw err
    }
}

export default {processRequest}
