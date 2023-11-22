const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');

exports.lambdaHandler = async (event) => {

  //  Log the event.
  console.log(JSON.stringify(event, null, 4));

  // Extract duration and taskToken from the incoming event
  const duration = event.detail.video.durationmillis;
  const taskToken = event.detail.taskToken;

  // Determine video validity based on duration
  let valid;
  if (duration > 10000) {
    valid = {
      "valid": true
    };
  } else {
    valid = {
      "valid": false,
      "reason": "video is too short"
    };
  }

  // Configure the EventBridge client
  const eventBridgeClient = new EventBridgeClient();

  // Define the event to be sent to EventBridge
  const eventToSend = {
    Source: 'serverlessVideo.plugin.duration_plugin',
    DetailType: 'plugin-complete',
    EventBusName: "default",
    Detail: JSON.stringify({"TaskToken": taskToken,"Message":valid})
  };

  console.log('Event to send', JSON.stringify(eventToSend, null, 4));

  // Create a command to put the event
  const putEventCommand = new PutEventsCommand({
    Entries: [eventToSend]
  });

  try {
    // Put the event on EventBridge
    await eventBridgeClient.send(putEventCommand);
    console.log('Event successfully sent to EventBridge');
  } catch (error) {
    console.error('Error sending event:', error);
    // Handle the error
  }

  return {
    statusCode: 200,
    body: JSON.stringify(valid), // Ensure the body is stringified
  };
};