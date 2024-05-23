import { loadConfig } from './config-loader.js'
import ctpClientBuilder from '../utils/ctp.js'

let config
let powerboardConfig
let ctpClient;


function getNotificationUrl() {
  return  process.env.CONNECT_SERVICE_URL ?? 'https://notification.powerboard-commercetools-app.jetsoftpro.dev'
}

async function getCtpClient() {
  if(!ctpClient){
    ctpClient = await ctpClientBuilder.get(getNotificationConfig())
  }
  return ctpClient;
}

function getModuleConfig() {

  return {
    removeSensitiveData: true,
    port: config.port,
    logLevel: config.logLevel,
    apiNotificationnBaseUrl: getNotificationUrl(),
    basicAuth: false,
    projectKey: config.projectKey,
    keepAliveTimeout: 30,
    addCommercetoolsLineIteprojectKey: false,
    generateIdempotencyKey: false
  }
}

async function getPowerboardApiUrl(){
  const powerboardC = await getPowerboardConfig('connection');
  return powerboardC.api_url;
}

function getNotificationConfig() {
  return {
    clientId: config.clientId ?? 'kjQW8-nXHq4CfKVdFzEjUl6c',
    clientSecret: config.clientSecret ?? 'Z1B_FP71UbE8xwcdAy_Q5FR7ztHSZZRJ',
    projectKey: config.projectKey ?? 'paydockecomm',
    apiUrl: config.apiUrl ?? 'https://api.europe-west1.gcp.commercetools.com',
    authUrl: config.authUrl ?? 'https://auth.europe-west1.gcp.commercetools.com'
  }
}

async function getPowerboardConfig(type = 'all') {
  if (!powerboardConfig) {
    ctpClient = await getCtpClient();
    const responsePowerboardConfig = await ctpClient.fetchById(
      ctpClient.builder.customObjects,
      'powerboardConfigContainer'
    )
    if (responsePowerboardConfig.body.results) {
      powerboardConfig = {}
      const {results} = responsePowerboardConfig.body
      results.forEach((element) => {
        powerboardConfig[element.key] = element.value
      })
    }
  }
  switch (type) {
    case 'connection': {
      // eslint-disable-next-line no-case-declarations
      const isSandboxConnection = powerboardConfig['sandbox']?.sandbox_mode ?? false;
      if (isSandboxConnection === 'Yes') {
        powerboardConfig['sandbox'].api_url = 'https://api.preproduction.powerboard.commbank.com.au';
        return powerboardConfig['sandbox'] ?? {};
      }
      powerboardConfig['live'].api_url = 'https://api.production.powerboard.commbank.com.au';
      return powerboardConfig['live'] ?? {};
    }
    case 'widget': {
      return powerboardConfig['live'] ?? {};
    }
    default: {
      return powerboardConfig;
    }
  }

}

function loadAndValidateConfig() {
  config = loadConfig()
  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      `[ CTP project credentials are missing. ` +
      'Please verify that all projects have projectKey, clientId and clientSecret'
    )
  }
}

loadAndValidateConfig()

// Using default, because the file needs to be exported as object.
export default {
  getModuleConfig,
  getPowerboardConfig,
  getNotificationUrl,
  getPowerboardApiUrl,
  getCtpClient,
  getNotificationConfig
}
