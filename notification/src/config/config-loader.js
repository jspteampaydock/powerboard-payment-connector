import {config} from "dotenv";

function loadConfig() {
  config();
  if (process.env.POWERBOARD_INTEGRATION_CONFIG) {
    return loadFromPowerboardIntegrationEnvVar()
  }
  return {}
}

function loadFromPowerboardIntegrationEnvVar() {
  try {
    return JSON.parse(process.env.POWERBOARD_INTEGRATION_CONFIG)
  } catch (e) {
    throw new Error(
        'Powerboard integration configuration is not provided in the JSON format',
    )
  }
}

export { loadConfig }
