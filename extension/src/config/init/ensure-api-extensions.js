import _ from 'lodash'
import { serializeError } from 'serialize-error'
import utils from '../../utils.js'

const mainLogger = utils.getLogger()

async function ensureApiExtensions(
  ctpClient,
  ctpProjectKey,
  ctpPaydockIntegrationBaseUrl
) {


  const apiExtensionTemplate = await utils.readAndParseJsonFile(
    'resources/api-extension.json',
  )

  const apiExtensionOrderTemplate = await utils.readAndParseJsonFile(
      'resources/api-order-extension.json',
  )
  try {
    const logger = mainLogger.child({
      commercetools_project_key: ctpProjectKey,
    })
    const extensionDraft = JSON.parse(
      _.template(JSON.stringify(apiExtensionTemplate))({
        ctpPaydockIntegrationBaseUrl,
      }),
    )

    const extensionOrderDraft = JSON.parse(
        _.template(JSON.stringify(apiExtensionOrderTemplate))({
          ctpPaydockIntegrationBaseUrl,
        }),
    )
    const existingExtension = await fetchExtensionByKey(
      ctpClient,
      apiExtensionTemplate.key,
    )

    const existingExtensionOrder = await fetchExtensionByKey(
        ctpClient,
        apiExtensionOrderTemplate.key,
    )
    const existingExtensionOrderPB = await fetchExtensionByKey(
        ctpClient,
        'powerboard-order-extension'
    )

    if (existingExtensionOrder === null && existingExtensionOrderPB === null) {
      await ctpClient.create(ctpClient.builder.extensions, extensionOrderDraft)
    }

    if (existingExtension === null) {
      await ctpClient.create(ctpClient.builder.extensions, extensionDraft)
      logger.info(
        'Successfully created an API extension for payment resource type ' +
          `(key=${apiExtensionTemplate.key})`,
      )
    } else {
      const actions = buildUpdateActions(existingExtension, extensionDraft)
      if (actions.length > 0) {
        await ctpClient.update(
          ctpClient.builder.extensions,
          existingExtension.id,
          existingExtension.version,
          actions,
        )
        logger.info(
          'Successfully updated the API extension for payment resource type ' +
            `(key=${apiExtensionTemplate.key})`,
        )
      }
    }
  } catch
      (err) {
    throw Error(
      `Failed to sync API extension (key=${apiExtensionTemplate.key}). ` +
        `Error: ${JSON.stringify(serializeError(err))}`,
    )
  }
}

function buildUpdateActions(existingExtension, extensionDraft) {
  const actions = []
  if (!_.isEqual(existingExtension.destination, extensionDraft.destination))
    actions.push({
      action: 'changeDestination',
      destination: extensionDraft.destination,
    })

  if (!_.isEqual(existingExtension.triggers, extensionDraft.triggers))
    actions.push({
      action: 'changeTriggers',
      triggers: extensionDraft.triggers,
    })

  return actions
}

async function fetchExtensionByKey(ctpClient, key) {
  try {
    const { body } = await ctpClient.fetchByKey(
      ctpClient.builder.extensions,
      key,
    )
    return body
  } catch (err) {
    if (err.statusCode === 404) return null
    throw err
  }
}

export { ensureApiExtensions }
