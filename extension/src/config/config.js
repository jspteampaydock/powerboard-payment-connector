import {loadConfig} from './config-loader.js'
import ctpClientBuilder from "../ctp.js";

let config
let powerboardConfig;
let ctpClient;

function getModuleConfig() {
    const extensionBaseUrl = process.env.CONNECT_SERVICE_URL ?? 'https://extension.powerboard-commercetools-app.jetsoftpro.dev';
    return {
        removeSensitiveData: true,
        port: config.port,
        logLevel: config.logLevel,
        apiExtensionBaseUrl: extensionBaseUrl,
        basicAuth: false,
        projectKey: config.projectKey,
        keepAliveTimeout: 30,
        addCommercetoolsLineIteprojectKey: false,
        generateIdempotencyKey: false
    }
}

async function getCtpClient() {
    if(!ctpClient){
        ctpClient = await ctpClientBuilder.get(getExtensionConfig())
    }
    return ctpClient;
}
async function getPowerboardApiUrl() {
    const powerboardC = await getPowerboardConfig('connection');
    return powerboardC.api_url;
}

function getExtensionConfig() {
    return {
        clientId: config.clientId ?? 'kjQW8-nXHq4CfKVdFzEjUl6c',
        clientSecret: config.clientSecret ?? 'Z1B_FP71UbE8xwcdAy_Q5FR7ztHSZZRJ',
        projectKey: config.projectKey ?? 'paydockecomm',
        apiUrl: config.apiUrl ?? 'https://api.europe-west1.gcp.commercetools.com',
        authUrl: config.authUrl ?? 'https://auth.europe-west1.gcp.commercetools.com'
    }
}


async function getPowerboardConfig(type = 'all', disableCache = false) {
    if (!powerboardConfig || disableCache) {
        ctpClient = await getCtpClient();
        const responsePowerboardConfig = await ctpClient.fetchById(
            ctpClient.builder.customObjects,
            'powerboardConfigContainer',
        )
        if (responsePowerboardConfig.body.results) {
            powerboardConfig = {};
            const results = responsePowerboardConfig.body.results.sort((a,b) => {
                if (a.version > b.version){
                    return 1;
                } 
                return -1;
                
            });
            results.forEach((element) => {
                powerboardConfig[element.key] = element.value;
            });
        }
    }
    switch (type) {
        case 'connection':
            // eslint-disable-next-line no-case-declarations
            const isSandboxConnection = powerboardConfig['sandbox']?.sandbox_mode ?? false;
            if (isSandboxConnection === 'Yes') {
                powerboardConfig['sandbox'].api_url = 'https://api.preproduction.powerboard.commbank.com.au';
                return powerboardConfig['sandbox'] ?? {};
            }
            powerboardConfig['live'].api_url = 'https://api.production.powerboard.commbank.com.au';
            return powerboardConfig['live'] ?? {};

        case 'widget:':
            return powerboardConfig['live'] ?? {};
        default:
            return powerboardConfig
    }

}


function loadAndValidateConfig() {
    config = loadConfig()
    if (!config.clientId || !config.clientSecret) {
        throw new Error(
            `[ CTP project credentials are missing. ` +
            'Please verify that all projects have projectKey, clientId and clientSecret',
        )
    }
}

loadAndValidateConfig()

export default {
    getModuleConfig,
    getPowerboardConfig,
    getCtpClient,
    getExtensionConfig,
    getPowerboardApiUrl
}
