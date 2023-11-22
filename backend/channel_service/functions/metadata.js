const { IvsClient, PutMetadataCommand } = require('@aws-sdk/client-ivs');
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { IoTDataPlaneClient, PublishCommand } = require('@aws-sdk/client-iot-data-plane');

const client = new IvsClient({});
const dynamodb = new DynamoDBClient({});
const iotClient = new IoTDataPlaneClient({});

let message = '';

exports.handler = async (event) => {
  try {
    // Process the SQS batch of messages
    for (const record of event.Records) {
      const payload = JSON.parse(record.body);
      console.log('Received message:', message);

      // The processing logic
      const channelId = payload.id;
      const body = payload.message;

      const params = {
        x: body.x,
        y: body.y,
        type: body.type,
        userId: body.userId,
      };

      // Put the information onto the stream for all stream watchers to see.
      try {
        //  Fetch the channel info from ddb
        const { Item } = await dynamodb.send(
          new GetItemCommand({
            TableName: 'serverlessVideo-channels-table',
            Key: {
              PK: { S: channelId },
            },
          })
        );
        const data = JSON.parse(Item.data.S);
        const command = new PutMetadataCommand({
          channelArn: data.Channel.Arn,
          metadata: JSON.stringify(params),
        });
        await client.send(command);
        message = 'Successfully added metadata';
      } catch (error) {
        if (error.message.includes('is not currently online')) {
          message = 'Channel is not online';
        }
        message = 'Internal server error';
      }

      // Try and send the message through IOT Core to the subscribed channel.
      // Broadcasters will also get the message (i.e get the emjoi)
      try {
        await iotClient.send(
          new PublishCommand({
            topic: `serverlessVideo-${channelId}`,
            qos: 1,
            payload: JSON.stringify({
              type: 'StreamMetadataSent',
              detail: params
            }),
          })
        );
      } catch (error) {
        // Do nothing as we don't mind if this happens.
        console.log('Failed to send IOT emjoi to broadcaster');
        console.log(error);
      }
    }

    return { statusCode: 200, body: 'Processed messages successfully' };
  } catch (error) {
    console.error('Error processing messages:', error);
    return { statusCode: 500, body: 'Error processing messages' };
  }
};
