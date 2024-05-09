import {serializeError} from 'serialize-error'
import VError from 'verror'
import config from '../../config/config.js'
import {addPowerboardHttpLog, addPowerboardLog} from '../../utils/logger.js'
import ctp from '../../utils/ctp.js'
import customObjectsUtils from '../../utils/custom-objects-utils.js'

async function processNotification(
    notificationResponse
) {
    const {notification, event} = notificationResponse

    const ctpConfig = config.getNotificationConfig()
    const ctpClient = await ctp.get(ctpConfig)

    let result = {}

    if (!notification.reference) {
        result.status = 'Failure'
        result.message = 'Reference not found'
    } else {
        const paymentKey = notification.reference
        const paymentObject = await getPaymentByMerchantReference(ctpClient, paymentKey)

        if (!paymentObject) {
            result.status = 'Failure'
            result.message = 'Payment not found'
        } else if (event !== undefined) {
            addPowerboardHttpLog(notificationResponse)
            switch (event) {
                case 'transaction_success':
                case 'transaction_failure':
                case 'fraud_check_in_review':
                case 'fraud_check_in_review_async_approved':
                case 'fraud_check_transaction_in_review_async_approved':
                case 'fraud_check_success':
                case 'fraud_check_transaction_in_review_approved':
                case 'fraud_check_failed':
                case 'fraud_check_transaction_in_review_declined':
                    result = await processWebhook(event, paymentObject, notification, ctpClient)
                    break
                case 'standalone_fraud_check_success':
                case 'standalone_fraud_check_failed':
                case 'standalone_fraud_check_in_review_approved':
                case 'standalone_fraud_check_in_review_declined':
                case 'standalone_fraud_check_in_review_async_approved':
                case 'standalone_fraud_check_in_review_async_declined':
                    result = await processFraudNotification(event, paymentObject, notification, ctpClient)
                    break
                case 'refund_success':
                    result = await processRefundSuccessNotification(event, paymentObject, notification, ctpClient)
                    break
                default:
                    result.status = 'Failure'
                    result.message = 'Notification Event not found'
            }
        }
    }

    return result
}

async function processWebhook(event, payment, notification, ctpClient) {
    const result = {}
    const status = await getNewStatuses(notification)
    const chargeId = notification._id
    const currentPayment = payment
    const currentVersion = payment.version

    let operation = notification.type
    operation = operation ? operation.toLowerCase() : 'undefined'
    operation = operation.charAt(0).toUpperCase() + operation.slice(1)

    const updateActions = [
        {
            action: 'setCustomField',
            name: 'PowerboardPaymentStatus',
            value: status.powerboard
        },
        {
            action: 'setCustomField',
            name: 'PaymentExtensionRequest',
            value: JSON.stringify({
                action: 'FromNotification',
                request: {}
            })
        }
    ]
    try {
        await ctpClient.update(ctpClient.builder.payments, currentPayment.id, currentVersion, updateActions)
        result.status = 'Success'
    } catch (error) {
        result.status = 'Failure'
        result.message = error
    }

    await addPowerboardLog({
        powerboardChargeID: chargeId,
        operation,
        status: result.status,
        message: result.message ?? ''
    })
    return result
}


async function processFraudNotification(event, payment, notification, ctpClient) {
    const result = {}
    let chargeId = notification.id
    const currentPayment = payment
    const currentVersion = payment.version

    const cacheName = `powerboard${notification.reference}`
    let updateActions = [];
    let operation = notification.type
    operation = operation ? operation.toLowerCase() : 'undefined'
    operation = operation.charAt(0).toUpperCase() + operation.slice(1)

    if (notification.status !== 'complete') {
        result.message = operation
        result.powerboardStatus = 'powerboard-failed'
        await customObjectsUtils.removeItem(cacheName)

        updateActions = [{
            action: 'setCustomField',
            name: 'PowerboardPaymentStatus',
            value: result.powerboardStatus
        },
            {
                action: 'setCustomField',
                name: 'PaymentExtensionRequest',
                value: JSON.stringify({
                    action: 'FromNotification',
                    request: {}
                })
            }]
        try {
            await ctpClient.update(ctpClient.builder.payments, currentPayment.id, currentVersion, updateActions)
        } catch (error) {
            result.status = 'Failure'
            result.message = error
        }
    } else {
        let cacheData = await customObjectsUtils.getItem(cacheName)
        if (cacheData) {
            cacheData = JSON.parse(cacheData)

            const paymentSource = notification.customer.payment_source
            if (cacheData.gateway_id) {
                paymentSource.gateway_id = cacheData.gateway_id
            }

            const isDirectCharge = cacheData.capture

            const fraudChargeId = notification.id

            const request = {
                amount: notification.amount,
                reference: notification.reference,
                currency: notification.currency,
                customer: {
                    first_name: cacheData.billingAddress.firstName,
                    last_name: cacheData.billingAddress.lastName,
                    email: cacheData.billingAddress.email,
                    phone: cacheData.billingAddress.phone
                },
                fraud_charge_id: fraudChargeId,
                capture: isDirectCharge,
                authorization: !isDirectCharge
            }
            request.customer.payment_source = paymentSource
            if (cacheData.charge3dsId) {
                request._3ds_charge_id = cacheData.charge3dsId
            }

            if (cacheData._3ds) {
                request._3ds = cacheData._3ds
            }

            if (cacheData.ccv) {
                request.customer.payment_source.card_ccv = cacheData.ccv
            }

            await customObjectsUtils.removeItem(cacheName)
            const response = await createCharge(request, {directCharge: isDirectCharge}, true)

            chargeId = response?.resource?.data?._id ?? 0


            if (response?.error) {
                result.status = 'UnfulfilledCondition'
                result.message = `Can't charge.${errorMessageToString(response)}`

                await addPowerboardLog({
                    powerboardChargeID: chargeId,
                    operation: 'Charge',
                    status: result.status,
                    message: result.message
                })
                return result
            }

            if (cacheData._3ds) {
                const attachResponse = await cardFraudAttach({fraudChargeId, chargeId})
                if (attachResponse?.error) {
                    result.status = 'UnfulfilledCondition'
                    result.message = `Can't fraud attach.${errorMessageToString(attachResponse)}`

                    await addPowerboardLog({
                        powerboardChargeID: chargeId,
                        operation: 'Fraud Attach',
                        status: result.status,
                        message: result.message
                    })
                    return result
                }
            }

            let status = response?.resource?.data?.status
            status = status ? status.toLowerCase() : 'undefined'
            status = status.charAt(0).toUpperCase() + status.slice(1)

            operation = response?.resource?.data?.type
            operation = operation ? operation.toLowerCase() : 'undefined'
            operation = operation.charAt(0).toUpperCase() + operation.slice(1)

            const isAuthorization = response?.resource?.data?.authorization ?? 0
            let isCompleted = false
            let commerceToolsPaymentStatus

            if (isAuthorization && ['Pending', 'Pre_authentication_pending'].includes(status)) {
                result.powerboardStatus = 'powerboard-authorize'
                commerceToolsPaymentStatus = 'Pending'
            } else {
                isCompleted = status === 'Complete'
                result.powerboardStatus = isCompleted ? 'powerboard-paid' : 'powerboard-pending'
                commerceToolsPaymentStatus = isCompleted ? 'Paid' : 'Pending'
            }

            updateActions = [
                {
                    action: 'setCustomField',
                    name: 'PowerboardPaymentStatus',
                    value: result.powerboardStatus
                },
                {
                    action: 'setCustomField',
                    name: 'PowerboardTransactionId',
                    value: chargeId
                },
                {
                    action: 'changePaymentState',
                    paymentState: commerceToolsPaymentStatus
                }
            ]


            try {
                await ctpClient.update(ctpClient.builder.payments, currentPayment.id, currentVersion, updateActions)
                result.status = 'Success'

                await addPowerboardLog({
                    powerboardChargeID: chargeId,
                    operation,
                    status: result.status,
                    message: ''
                })

                return result
            } catch (error) {
                result.status = 'Failure'
                result.message = error

                updateActions = [
                    {
                        action: 'setCustomField',
                        name: 'PowerboardPaymentStatus',
                        value: 'powerboard-failed'
                    },
                    {
                        action: 'setCustomField',
                        name: 'PowerboardTransactionId',
                        value: chargeId
                    },
                    {
                        action: 'setCustomField',
                        name: 'PaymentExtensionRequest',
                        value: JSON.stringify({
                            action: 'FromNotification',
                            request: {}
                        })
                    }
                ]
                await ctpClient.update(ctpClient.builder.payments, currentPayment.id, currentVersion, updateActions)
            }
        } else {
            result.message = 'Fraud data not found in localstorage'
        }
    }
    return result
}

async function createCharge(data, params = {}, returnObject = false) {
    try {
        let url = '/v1/charges'
        if (params.action !== undefined) {
            if (params.action === 'standalone-fraud') {
                url += '/fraud'
            }
            if (params.action === 'standalone-fraud-attach') {
                url += `/${params.chargeId}/fraud/attach`
            }
        }

        if (params.directCharge !== undefined && params.directCharge === false) {
            url += '?capture=false'
        }

        const {response} = await callPowerboard(url, data, 'POST')

        if (returnObject) {
            return response
        }

        if (response.status === 201) {
            return {
                status: 'Success',
                message: 'Charge is created successfully',
                chargeId: response.resource.data._id
            }
        }

        return {
            status: 'Failure',
            message: response?.error?.message,
            chargeId: '0'
        }
    } catch (error) {
        return {
            status: 'Failure',
            message: error.message || 'Unknown error',
            chargeId: '0'
        }
    }
}

async function processRefundSuccessNotification(event, payment, notification, ctpClient) {
    const result = {}
    let powerboardStatus
    if (!notification.transaction || (notification.from_webhook !== undefined && notification.from_webhook)) {
        result.status = 'Failure'
    } else {
        let chargeId = notification.id
        const currentPayment = payment
        const currentVersion = payment.version

        let prevResponseOfExtension = currentPayment?.custom?.fields?.PaymentExtensionResponse
        if (prevResponseOfExtension) {
            prevResponseOfExtension = JSON.parse(prevResponseOfExtension)
            const prevResponseOfExtensionMessage = prevResponseOfExtension?.message
            if (prevResponseOfExtensionMessage === 'Merchant refunded money') {
                await ctpClient.update(ctpClient.builder.payments, currentPayment.id, currentVersion, [
                    {
                        action: 'setCustomField',
                        name: 'PaymentExtensionResponse',
                        value: null
                    },
                    {
                        action: 'setCustomField',
                        name: 'PaymentExtensionRequest',
                        value: JSON.stringify({
                            action: 'FromNotification',
                            request: {}
                        })
                    }
                ])
                return {status: 'Success', message: ''}
            }
        }

        let fraction = 1;
        if (currentPayment.amountPlanned.type === 'centPrecision') {
            fraction = 10 ** currentPayment.amountPlanned.fractionDigits ?? 1;
        }
        const orderAmount = currentPayment.amountPlanned.centAmount / fraction;

        let oldRefundAmount = currentPayment?.custom?.fields?.RefundedAmount
        oldRefundAmount = oldRefundAmount ?? 0
        const refundAmount = parseFloat(notification.transaction.amount) ?? 0
        let notificationStatus = notification.status
        notificationStatus = notificationStatus ? notificationStatus.toLowerCase() : 'undefined'
        notificationStatus = notificationStatus.charAt(0).toUpperCase() + notificationStatus.slice(1)

        let operation = notification.type
        operation = operation ? operation.toLowerCase() : 'undefined'
        operation.charAt(0).toUpperCase() + operation.slice(1)
        if (['REFUNDED', 'REFUND_REQUESTED'].includes(notificationStatus.toUpperCase())) {
            powerboardStatus = (oldRefundAmount + refundAmount) < orderAmount ? 'powerboard-p-refund' : 'powerboard-refunded'
        }
        if (powerboardStatus && refundAmount) {
            const refunded = powerboardStatus === 'powerboard-refunded' ? orderAmount : oldRefundAmount + refundAmount;
            const updateActions = [
                {
                    action: 'setCustomField',
                    name: 'PowerboardPaymentStatus',
                    value: powerboardStatus
                },
                {
                    action: 'setCustomField',
                    name: 'RefundedAmount',
                    value: refunded
                },
                {
                    action: 'setCustomField',
                    name: 'PaymentExtensionRequest',
                    value: JSON.stringify({
                        action: 'FromNotification',
                        request: {}
                    })
                }
            ]

            if (chargeId) {
                updateActions.push({
                    action: 'setCustomField',
                    name: 'PowerboardTransactionId',
                    value: chargeId
                })
            }

            try {
                await ctpClient.update(ctpClient.builder.payments, currentPayment.id, currentVersion, updateActions)
                result.status = 'Success'
                result.message = `Refunded ${refunded}`
            } catch (error) {
                result.status = 'Failure'
                result.message = error
            }
        }
        chargeId = chargeId ?? currentPayment.custom.fields.PowerboardTransactionId
        await addPowerboardLog({
            powerboardChargeID: chargeId,
            operation: powerboardStatus,
            status: result.status,
            message: result.message ?? ''
        })
    }
    return result

}


async function getPaymentByMerchantReference(
    ctpClient,
    paymentKey
) {
    try {
        // eslint-disable-next-line no-shadow
        const result = await ctpClient.fetchById(ctpClient.builder.payments, paymentKey)
        return result.body
    } catch (err) {
        if (err.statusCode === 404) return null
        const errMsg =
            `Failed to fetch a payment` +
            `Error: ${JSON.stringify(serializeError(err))}`
        throw new VError(err, errMsg)
    }
}

async function cardFraudAttach({fraudChargeId, chargeId}) {
    const request = {
        fraud_charge_id: fraudChargeId
    }

    return createCharge(request, {action: 'standalone-fraud-attach', chargeId}, true)
}


async function getNewStatuses(notification) {
    let {status} = notification
    status = status ? status.toLowerCase() : 'undefined'
    status = status.charAt(0).toUpperCase() + status.slice(1)

    let powerboardPaymentStatus
    let commerceToolsPaymentStatus


    switch (status.toUpperCase()) {
        case 'COMPLETE':
            powerboardPaymentStatus = 'powerboard-paid'
            commerceToolsPaymentStatus = 'Paid'
            break
        case 'PENDING':
        case 'PRE_AUTHENTICATION_PENDING':
            powerboardPaymentStatus = notification.capture ? 'powerboard-pending' : 'powerboard-authorize'
            commerceToolsPaymentStatus = 'Pending'
            break
        case 'CANCELLED':
            powerboardPaymentStatus = 'powerboard-cancelled'
            commerceToolsPaymentStatus = 'Failed'
            break
        case 'REFUNDED':
            powerboardPaymentStatus = 'powerboard-refunded'
            commerceToolsPaymentStatus = 'Paid'
            break
        case 'REQUESTED':
            powerboardPaymentStatus = 'powerboard-requested'
            commerceToolsPaymentStatus = 'Pending'
            break
        case 'FAILED':
            powerboardPaymentStatus = 'powerboard-failed'
            commerceToolsPaymentStatus = 'Failed'
            break
        default:
            powerboardPaymentStatus = ''
            commerceToolsPaymentStatus = ''
    }

    return {powerboard: powerboardPaymentStatus, commerceTools: commerceToolsPaymentStatus}
}


async function callPowerboard(url, data, method) {
    let returnedRequest
    let returnedResponse
    url = await generatePowerboardUrlAction(url)
    try {
        const {response, request} = await fetchAsyncPowerboard(url, data, method)
        returnedRequest = request
        returnedResponse = response
    } catch (err) {
        returnedRequest = {body: JSON.stringify(data)}
        returnedResponse = serializeError(err)
    }

    return {request: returnedRequest, response: returnedResponse}
}

async function generatePowerboardUrlAction(url) {
    const apiUrl = await config.getPowerboardApiUrl()
    return apiUrl + url
}

async function fetchAsyncPowerboard(
    url,
    requestObj,
    method
) {
    let response
    let responseBody
    let responseBodyInText
    const request = await buildRequestPowerboard(requestObj, method)

    try {
        response = await fetch(url, request)
        responseBodyInText = await response.text()
        responseBody = responseBodyInText ? JSON.parse(responseBodyInText) : ''
    } catch (err) {
        if (response)
            // Handle non-JSON format response
            throw new Error(
                `Unable to receive non-JSON format resposne from Powerboard API : ${responseBodyInText}`
            )
        // Error in fetching URL
        else throw err
    } finally {
        if (responseBody.additionalData) {
            delete responseBody.additionalData
        }
    }
    return {response: responseBody, request}
}

async function buildRequestPowerboard(requestObj, methodOverride) {
    const powerboardCredentials = await config.getPowerboardConfig('connection')
    const requestHeaders = {
        'Content-Type': 'application/json',
        'x-user-secret-key': powerboardCredentials.credentials_secret_key
    }

    const request = {
        method: methodOverride || 'POST',
        headers: requestHeaders
    }
    if (methodOverride !== 'GET') {
        request.body = JSON.stringify(requestObj)
    }
    return request
}

function errorMessageToString(response) {
    let result = response.error && response.error.message ? ` ${response.error.message}` : ''

    if (response.error && response.error.details) {
        if (Array.isArray(response.error.details.messages) && response.error.details.messages.length > 0) {
            return response.error.details.messages[0]
        }

        const firstDetail = Object.values(response.error.details)[0]
        if (Array.isArray(firstDetail)) {
            result += ` ${firstDetail.join(',')}`
        } else {
            result += ` ${Object.values(response.error.details).join(',')}`
        }
    }

    return result
}

export default {processNotification}
