const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { Metrics, MetricUnits } = require('@aws-lambda-powertools/metrics');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');

const eventBridgeClient = new EventBridgeClient({});
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const metrics = new Metrics({
  namespace: 'serverlessVideo',
  serviceName: 'videoManagerService',
});

exports.lambdaHandler = async (event) => {

  console.log('event', JSON.stringify(event, null, 4))

  
  const videoId = event.detail.id;

  let status = 'valid';
  if (event.detail.plugins.status == 'failed') {
    status = 'failed';
  }
  if (event.detail.plugins.status == 'invalid') {
    status = 'invalid';
  }

  // raise custom metrics
  metrics.addDimension('By VideoId', videoId);
  metrics.addMetric(status, MetricUnits.Count, 1);
  metrics.publishStoredMetrics();

  // Set the status variable accordingly
  const command = new UpdateCommand({
    TableName: process.env.Table,
    Key: {
      PK: videoId,
    },
    UpdateExpression: 'set plugins = :plugins, #status = :valid, pluginLifecycleWorkflowExecutionId= :pluginLifecycleWorkflowExecutionId' ,
    ExpressionAttributeValues: {
      ':plugins': event.detail.plugins,
      ':pluginLifecycleWorkflowExecutionId': event.detail.pluginLifecycleWorkflowExecutionId,
      ':valid': status,
    },
    ExpressionAttributeNames: {
      '#status': 'videoStatus',
    },
    ReturnValues: 'ALL_NEW',
  });


  // Raise updated event
  try {
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'serverlessVideo.videoManager',
            DetailType: 'VideoStatusUpdated',
            Detail: JSON.stringify({
              ...event.detail,
              status
            }),
            EventBusName: 'default',
          },
        ],
      })
    );
  } catch (error) {
    console.error('Error putting event to EventBridge:', error);
  }

  // Save to DDB
  try {
    await docClient.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data written to DynamoDB' }),
    };
  } catch (error) {
    console.error('Error writing to DynamoDB:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error writing to DynamoDB' }),
    };
  }
};