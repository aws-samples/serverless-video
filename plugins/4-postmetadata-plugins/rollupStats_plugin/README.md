# Rollup Statistics Plugin

This is a simple plugin that produces realtime, all up statistics on the videos in serverlessVideo. It currently publishes the total number of videos and the aggregate hours of video available on the site. 

## Design

This plugin listens for the postMetadata hook event, which triggers a Lambda function. The function does the following
    - Checks a DynamoDB Table for an item with the same id, this is an idempotency check to make sure we don't double count if we get a duplicate event
    - Writes the metadata about the video to the DynamoDB Table
    - Updates the video count in the DynamoDB Table
    - Updates the aggregate hours of video in the DynamoDB Table
    - Emits Cloudwatch Metrics for both statistics
    - Publishes an event to the EventBridge default bus with the updated values of the statistics

The Lambda function is written in Python and makes use of a number of features in Python Lambda Powertools. 

## Testing

Once you've deployed the plugin, you can test it by sending a sample event to the default EventBridge bus

`aws events put-events --entries file://test_events/EB-postMetadata_event-1.json`

If you then look at the dynamodb table you should see the video_count item increment and the total_hours add the time of the video. You'll also see an item written for that event.
