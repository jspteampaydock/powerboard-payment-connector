import {
    createSetCustomFieldAction,
} from './payment-utils.js'
import c from '../config/constants.js'
import config from "../config/config.js";
import {getUserVaultTokens} from "../service/web-component-service.js";

async function execute(paymentObject) {

    const paymentExtensionRequest = JSON.parse(
        paymentObject?.custom?.fields?.PaymentExtensionRequest
    )
    let CommerceToolsUserId = null;

    const amountPlanned = paymentObject.amountPlanned ?? null;
    let totalPrice = 0;
    if (amountPlanned && amountPlanned.type === "centPrecision") {
        const fraction = 10 ** amountPlanned.fractionDigits;
        const centAmount = amountPlanned.centAmount;
        totalPrice = centAmount / fraction;
    }

    if(paymentExtensionRequest.request){
        CommerceToolsUserId = paymentExtensionRequest.request.CommerceToolsUserId
    }
    const powerboardCredentials = await config.getPowerboardConfig('all', true);
    let connection = {};
    if (powerboardCredentials.sandbox.sandbox_mode === "Yes") {
        connection = powerboardCredentials.sandbox;
    } else {
        connection = powerboardCredentials.live;
    }


    const savedCredentials = {};
    if (CommerceToolsUserId) {
        const userVaultTokens = await getUserVaultTokens(CommerceToolsUserId);
        if (userVaultTokens.length) {
            for (const item of userVaultTokens) {
                if (savedCredentials[item.type] === undefined) {
                    savedCredentials[item.type] = {}
                }
                savedCredentials[item.type][item.vault_token] = item;
            }
        }
    }

    const responseData = {
        sandbox_mode: powerboardCredentials.sandbox.sandbox_mode,
        api_credentials: {
            credentials_type: connection.credentials_type,
            credentials_public_key: connection.credentials_public_key,
            credentials_widget_access_key: connection.credentials_widget_access_key
        },
        payment_methods: {
            "card": {
                name: "powerboard-pay-card",
                type: "card",
                title: powerboardCredentials.widget.payment_methods_cards_title,
                description: powerboardCredentials.widget.payment_methods_cards_description,
                config: {
                    card_use_on_checkout: isUseOnCheckout('card', connection, powerboardCredentials, totalPrice),
                    card_gateway_id: connection.card_gateway_id,
                    card_3ds: connection.card_3ds,
                    card_3ds_service_id: connection.card_3ds_service_id,
                    card_3ds_flow: connection.card_3ds_flow,
                    card_fraud: connection.card_fraud,
                    card_fraud_service_id: connection.card_fraud_service_id,
                    card_direct_charge: connection.card_direct_charge,
                    card_supported_card_schemes: connection.card_supported_card_schemes,
                    card_card_save: connection.card_card_save,
                    card_card_method_save: connection.card_card_method_save
                }
            },
            "bank_accounts": {
                name: "powerboard-pay-bank-accounts",
                type: "bank_accounts",
                title: powerboardCredentials.widget.payment_methods_bank_accounts_title,
                description: powerboardCredentials.widget.payment_methods_bank_accounts_description,
                config: {
                    bank_accounts_use_on_checkout: connection.bank_accounts_use_on_checkout,
                    bank_accounts_gateway_id: connection.bank_accounts_gateway_id,
                    bank_accounts_bank_account_save: connection.bank_accounts_bank_account_save,
                    bank_accounts_bank_method_save: connection.bank_accounts_bank_method_save,
                }
            },
            "apple-pay": {
                name: "powerboard-pay-apple-pay",
                type: "apple-pay",
                title: powerboardCredentials.payment_methods_wallets_apple_pay_title,
                description: powerboardCredentials.payment_methods_wallets_apple_pay_description,
                config: {
                    wallets_apple_pay_use_on_checkout: isUseOnCheckout('apple-pay', connection, powerboardCredentials, totalPrice),
                    wallets_apple_pay_gateway_id: connection.wallets_apple_pay_gateway_id,
                    wallets_apple_pay_fraud: connection.wallets_apple_pay_fraud,
                    wallets_apple_pay_fraud_service_id: connection.wallets_apple_pay_fraud_service_id,
                    wallets_apple_pay_direct_charge: connection.wallets_apple_pay_direct_charge
                }
            },
            "google-pay": {
                name: "powerboard-pay-google-pay",
                type: "google-pay",
                title: powerboardCredentials.payment_methods_wallets_google_pay_title,
                description: powerboardCredentials.payment_methods_wallets_google_pay_description,
                config: {
                    wallets_google_pay_use_on_checkout: isUseOnCheckout('google-pay', connection, powerboardCredentials, totalPrice),
                    wallets_google_pay_gateway_id: connection.wallets_google_pay_gateway_id,
                    wallets_google_pay_fraud: connection.wallets_google_pay_fraud,
                    wallets_google_pay_fraud_service_id: connection.wallets_google_pay_fraud_service_id,
                    wallets_google_pay_direct_charge: connection.wallets_google_pay_direct_charge
                }
            },
            "afterpay_v2": {
                name: "powerboard-pay-afterpay_v2",
                type: "afterpay_v2",
                title: powerboardCredentials.payment_methods_wallets_afterpay_v2_title,
                description: powerboardCredentials.payment_methods_wallets_afterpay_v2_description,
                config: {
                    wallets_afterpay_v2_use_on_checkout: connection.wallets_afterpay_v2_use_on_checkout,
                    wallets_afterpay_v2_gateway_id: connection.wallets_afterpay_v2_gateway_id,
                    wallets_afterpay_v2_fraud: connection.wallets_afterpay_v2_fraud,
                    wallets_afterpay_v2_direct_charge: connection.wallets_afterpay_v2_direct_charge,
                    wallets_afterpay_v2_fraud_service_id: connection.wallets_afterpay_v2_fraud_service_id
                }
            },
            "paypal_smart": {
                name: "powerboard-pay-paypal_smart",
                type: "paypal_smart",
                title: powerboardCredentials.payment_methods_wallets_paypal_title,
                description: powerboardCredentials.payment_methods_wallets_paypal_description,
                config: {
                    wallets_paypal_smart_button_use_on_checkout: isUseOnCheckout('paypal', connection, powerboardCredentials, totalPrice),
                    wallets_paypal_smart_button_gateway_id: connection.wallets_paypal_smart_button_gateway_id,
                    wallets_paypal_smart_button_fraud: connection.wallets_paypal_smart_button_fraud,
                    wallets_paypal_smart_button_fraud_service_id: connection.wallets_paypal_smart_button_fraud_service_id,
                    wallets_paypal_smart_button_direct_charge: connection.wallets_paypal_smart_button_direct_charge,
                    wallets_paypal_smart_button_pay_later: connection.wallets_paypal_smart_button_pay_later
                }
            },
            "afterpay_v1": {
                name: "powerboard-pay-afterpay_v1",
                type: "afterpay_v1",
                title: powerboardCredentials.payment_methods_alternative_payment_method_afterpay_v1_title,
                description: powerboardCredentials.payment_methods_alternative_payment_method_afterpay_v1_description,
                config: {
                    alternative_payment_methods_afterpay_v1_use_on_checkout: isUseOnCheckout('afterpay_v1', connection, powerboardCredentials, totalPrice),
                    alternative_payment_methods_afterpay_v1_gateway_id: connection.alternative_payment_methods_afterpay_v1_gateway_id,
                    alternative_payment_methods_afterpay_v1_fraud: connection.alternative_payment_methods_afterpay_v1_fraud,
                    alternative_payment_methods_afterpay_v1_fraud_service_id: connection.alternative_payment_methods_afterpay_v1_fraud_service_id,
                    alternative_payment_methods_afterpay_v1_direct_charge: connection.alternative_payment_methods_afterpay_v1_direct_charge
                }
            },
            "zippay": {
                name: "powerboard-pay-zippay",
                type: "zippay",
                title: powerboardCredentials.payment_methods_alternative_payment_method_zip_title,
                description: powerboardCredentials.payment_methods_alternative_payment_method_zip_description,
                config: {
                    alternative_payment_methods_zippay_use_on_checkout: isUseOnCheckout('zippay', connection, powerboardCredentials, totalPrice),
                    alternative_payment_methods_zippay_gateway_id: connection.alternative_payment_methods_zippay_gateway_id,
                    alternative_payment_methods_zippay_fraud: connection.alternative_payment_methods_zippay_fraud,
                    alternative_payment_methods_zippay_direct_charge: connection.alternative_payment_methods_zippay_direct_charge,
                    alternative_payment_methods_zippay_fraud_service_id: connection.alternative_payment_methods_zippay_fraud_service_id
                }
            }
        },
        widget_configuration: {
            version: {
                version_version: powerboardCredentials.widget.version_version,
                version_custom_version: powerboardCredentials.widget.version_custom_version
            },
            payment_methods: {
                cards: {
                    payment_methods_cards_title: powerboardCredentials.widget.payment_methods_cards_title,
                    payment_methods_cards_description: powerboardCredentials.widget.payment_methods_cards_description
                },
                bank_accounts: {
                    payment_methods_bank_accounts_title: powerboardCredentials.widget.payment_methods_bank_accounts_title,
                    payment_methods_bank_accounts_description:  powerboardCredentials.widget.payment_methods_bank_accounts_description,
                },
                wallets: {
                    payment_methods_wallets_apple_pay_title: powerboardCredentials.widget.payment_methods_wallets_apple_pay_title,
                    payment_methods_wallets_apple_pay_description: powerboardCredentials.widget.payment_methods_wallets_apple_pay_description,
                    payment_methods_wallets_google_pay_title: powerboardCredentials.widget.payment_methods_wallets_google_pay_title,
                    payment_methods_wallets_google_pay_description: powerboardCredentials.widget.payment_methods_wallets_google_pay_description,
                    payment_methods_wallets_afterpay_v2_title: powerboardCredentials.widget.payment_methods_wallets_afterpay_v2_title,
                    payment_methods_wallets_afterpay_v2_description: powerboardCredentials.widget.payment_methods_wallets_afterpay_v2_description,
                    payment_methods_wallets_paypal_title: powerboardCredentials.widget.payment_methods_wallets_paypal_title,
                    payment_methods_wallets_paypal_description: powerboardCredentials.widget.payment_methods_wallets_paypal_description
                },
                alternative_payment_methods: {
                    payment_methods_alternative_payment_method_afterpay_v1_title: powerboardCredentials.widget.payment_methods_alternative_payment_method_afterpay_v1_title,
                    payment_methods_alternative_payment_method_afterpay_v1_description: powerboardCredentials.widget.payment_methods_alternative_payment_method_afterpay_v1_description,
                    payment_methods_alternative_payment_method_zip_title: powerboardCredentials.widget.payment_methods_alternative_payment_method_zip_title,
                    payment_methods_alternative_payment_method_zip_description: powerboardCredentials.widget.payment_methods_alternative_payment_method_zip_description
                }
            },
            widget_style:{
                widget_style_bg_color: powerboardCredentials.widget.widget_style_bg_color,
                widget_style_text_color: powerboardCredentials.widget.widget_style_text_color,
                widget_style_border_color: powerboardCredentials.widget.widget_style_border_color,
                widget_style_error_color: powerboardCredentials.widget.widget_style_success_color,
                widget_style_success_color: powerboardCredentials.widget.widget_style_success_color,
                widget_style_font_size: powerboardCredentials.widget.widget_style_font_size,
                widget_style_font_family: powerboardCredentials.widget.widget_style_font_family,
                widget_style_custom_element: powerboardCredentials.widget.widget_style_custom_element
            }
        },
        saved_credentials: savedCredentials
    }

    const actions = []
    actions.push(createSetCustomFieldAction(c.CTP_INTERACTION_PAYMENT_EXTENSION_RESPONSE, responseData));
    return {actions}
}


function isUseOnCheckout(paymentMethod, connection, powerboardCredentials, totalPrice) {
    const paymentMethods = {
        'card': 'card',
        'apple-pay': 'wallets_apple_pay',
        'google-pay': 'wallets_google_pay',
        'paypal': 'wallets_paypal',
        'afterpay_v1': 'alternative_payment_method_afterpay_v1',
        'zippay': 'alternative_payment_method_zippay'
    };

    const keysUseOnCheckout = {
        'card': 'card',
        'apple-pay': 'wallets_apple_pay',
        'google-pay': 'wallets_google_pay',
        'paypal': 'wallets_paypal_smart_button',
        'afterpay_v1': 'alternative_payment_methods_afterpay_v1',
        'zippay': 'alternative_payment_methods_zippay'
    };
    const keyUseOnCheckout = keysUseOnCheckout[paymentMethod];
    const methodKey = paymentMethods[paymentMethod];
    if (!methodKey || !paymentMethod) {
        return 'No';
    }

    const methodConfig = {
        useOnCheckout: connection[`${keyUseOnCheckout}_use_on_checkout`],
        minValue: powerboardCredentials.widget[`payment_methods_${methodKey}_min_value`],
        maxValue: powerboardCredentials.widget[`payment_methods_${methodKey}_max_value`]
    };

    totalPrice = Number(totalPrice);
    const isWithinRange = (!methodConfig.minValue || totalPrice >= Number(methodConfig.minValue)) &&
        (!methodConfig.maxValue || totalPrice <= Number(methodConfig.maxValue));
    return methodConfig.useOnCheckout === 'Yes' && isWithinRange ? 'Yes' : 'No';
}

export default {execute}
