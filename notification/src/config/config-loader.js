// import rc from 'rc'
import {config} from "dotenv";

function loadConfig() {
  config();
  if (process.env.POWERBOARD_INTEGRATION_CONFIG) {
    return loadFromPowerboardIntegrationEnvVar()
  }
  return {}
  // return loadFromExternalFile()
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

/* function loadFromExternalFile() {
  const appName = 'extension'
  const configFromExternalFile = rc(appName)
  const hasConfig = configFromExternalFile?.configs?.length > 0
  if (!hasConfig) {
    throw new Error('Powerboard integration configuration is not provided.')
  }
  return configFromExternalFile
} */

export { loadConfig }
