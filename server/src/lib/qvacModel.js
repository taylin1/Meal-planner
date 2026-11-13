const { loadModel, QWEN3_600M_INST_Q4 } = require('@qvac/sdk')

let modelId = null
let modelLoading = false

async function startModel() {
  if (modelLoading) return

  modelLoading = true
  console.log('Starting Qvac model load...')

  try {
    // No artificial timeout here: the first load also starts the SDK worker
    // (and can read ~380 MB of weights from disk). Racing it against a timer
    // would drop a load that finishes later, leaving modelId permanently null.
    modelId = await loadModel({
      modelSrc: QWEN3_600M_INST_Q4,
      modelConfig: { device: 'cpu' }
    })

    console.log('✓ Qvac model loaded successfully.')
  } catch (err) {
    console.error('✗ Failed to load Qvac model:', err.message)
    modelId = null
  } finally {
    modelLoading = false
  }
}

function getModelId() {
  return modelId
}

module.exports = { startModel, getModelId }

