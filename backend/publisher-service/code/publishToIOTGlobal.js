/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const { IoTDataPlaneClient, PublishCommand } = require('@aws-sdk/client-iot-data-plane')
const iotdata = new IoTDataPlaneClient({ 
  region: process.env.AWS_REGION,
  endpoint: process.env.IOT_DATA_ENDPOINT 
})

// Publishes the message to the IoT topic
const iotPublish = async function (baseTopic, event) {

  try {

    const topic = `${baseTopic}` 

    const params = {
      topic,
      qos: 1,
      payload: JSON.stringify({
        type: event['detail-type'],
        detail: event.detail
      })
    }
    console.log('Params: ', params)
    const command = new PublishCommand(params)
    const result = await iotdata.send(command)
    console.log('iotPublish successful: ', topic, result)
  } catch (err) {
    console.error('iotPublish error:', err)
  }
}

exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2))
  await iotPublish(process.env.IOT_TOPIC, event)
}
