import {
    createSetCustomFieldAction,
    createAddTransactionActionByResponse,
    getPaymentKeyUpdateAction, deleteCustomFieldAction,
} from './payment-utils.js'
import c from '../config/constants.js'
import {makePayment} from '../service/web-component-service.js'

async function execute(paymentObject) {
    const makePaymentRequestObj = JSON.parse(
        paymentObject.custom.fields.makePaymentRequest,
    )

    if (paymentObject.amountPlanned.type === 'centPrecision') {
        const fraction = 10 ** paymentObject.amountPlanned.fractionDigits;
        makePaymentRequestObj.amount.value = paymentObject.amountPlanned.centAmount / fraction;
    }
    let paymentActions = [];
    const actions = []
    const customFieldsToDelete = [
        'makePaymentRequest',
        'makePaymentResponse',
        'getVaultTokenRequest',
        'getVaultTokenResponse',
        'PaymentExtensionRequest'
    ];
    const [response] = await Promise.all([makePayment(makePaymentRequestObj)])
    if (response.status === 'Failure') {
        const errorMessage = response.message ?? "Invalid transaction details"
        actions.push(createSetCustomFieldAction(c.CTP_INTERACTION_PAYMENT_EXTENSION_RESPONSE, JSON.stringify({
            status: "Failure",
            message: errorMessage
        })));
        paymentActions = await deleteCustomFields(actions, paymentObject, customFieldsToDelete);
        return {
            actions: paymentActions
        };
    }
    const requestBodyJson = JSON.parse(paymentObject?.custom?.fields?.makePaymentRequest);

    const paymentMethod = requestBodyJson?.PaydockPaymentType;
    const paydockTransactionId = response?.chargeId ?? requestBodyJson?.PaydockTransactionId;
    const paydockStatus = response?.paydockStatus ?? requestBodyJson?.PaydockPaymentStatus;
    const commerceToolsUserId = requestBodyJson?.CommerceToolsUserId;
    const additionalInfo = requestBodyJson?.AdditionalInfo;

    if (paymentMethod) {
        actions.push(createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_PAYDOCK_PAYMENT_TYPE, paymentMethod));
    }
    if (paydockStatus) {
        actions.push(createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_PAYDOCK_PAYMENT_STATUS, paydockStatus));
    }
    if (paydockTransactionId) {
        actions.push(createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_PAYDOCK_TRANSACTION_ID, paydockTransactionId));
    }

    if (commerceToolsUserId) {
        actions.push(createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_COMMERCE_TOOLS_USER, commerceToolsUserId));
    }

    if (additionalInfo) {
        actions.push(createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_ADDITIONAL_INFORMATION, JSON.stringify(additionalInfo)));
    }
    const updatePaymentAction = getPaymentKeyUpdateAction(
        paymentObject.key,
        {body: paymentObject.custom.fields.makePaymentRequest},
        response,
    )
    if (updatePaymentAction) actions.push(updatePaymentAction)

    const addTransactionAction = createAddTransactionActionByResponse(
        paymentObject.amountPlanned.centAmount,
        paymentObject.amountPlanned.currencyCode,
        response,
    )

    if (addTransactionAction) {
        actions.push(addTransactionAction)
    }

    if (paydockStatus) {
        const {orderState, orderPaymentState} = await getCommercetoolsStatusesByPaydockStatus(paydockStatus)
        actions.push(createSetCustomFieldAction(c.CTP_INTERACTION_PAYMENT_EXTENSION_RESPONSE, JSON.stringify({
            orderPaymentStatus: orderPaymentState,
            orderStatus: orderState
        })));
    } else {
        customFieldsToDelete.push(c.CTP_INTERACTION_PAYMENT_EXTENSION_RESPONSE)
    }
    paymentActions = await deleteCustomFields(actions, paymentObject, customFieldsToDelete)
    return {
        actions: paymentActions
    }
}


async function getCommercetoolsStatusesByPaydockStatus(paydockStatus) {
    let orderPaymentState
    let orderState

    switch (paydockStatus) {
        case 'paydock-paid':
            orderPaymentState = 'Paid'
            orderState = 'Open'
            break
        case 'paydock-pending':
        case 'paydock-authorize':
        case 'paydock-requested':
            orderPaymentState = 'Pending'
            orderState = 'Open'
            break
        case 'paydock-cancelled':
        case 'paydock-failed':
            orderPaymentState = 'Failed'
            orderState = 'Cancelled'
            break
        case 'paydock-refunded':
            orderPaymentState = 'Paid'
            orderState = 'Cancelled'
            break
        default:
            orderPaymentState = 'Pending'
            orderState = 'Open'
    }

    return {orderState, orderPaymentState}
}

async function deleteCustomFields(actions, paymentObject, customFieldsToDelete) {
    const customFields = paymentObject?.custom?.fields;
    if (customFields) {
        customFieldsToDelete.forEach(field => {
            if (typeof customFields[field] !== 'undefined' && customFields[field]) {
                actions.push(deleteCustomFieldAction(field));
            }
        });
    }
    return actions
}

export default {execute}
