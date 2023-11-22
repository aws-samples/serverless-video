# Content Moderation Plugin

This is a `preValidate` plugin that moderates the content for inappropriate, unwanted, or offensive content. The plugin uses Amazon Rekognition Video analysis and restricts on-demand playback if inappropriate content is found. 

## Design
This plugin listens for the `preValidate` hook event, which triggers an Express Step Functions workflow. The state machine does the following:
  - Checks if video content is available in an S3 bucket or should use the `playbackUrl` to download the video to a bucket for further analysis.
  - Kicks of Rekognition's `StartContentModeration` async call for video with a `MinConfidence` score of 95. Captures the `JobId`.
  - Waits in a loop to check if the job has SUCCEEDED.
  - On success, the workflow uses the response from `GetContentModeration` API to collect `ModerationLabels`.
  - If [ModerationLabels](https://docs.aws.amazon.com/rekognition/latest/dg/moderation.html#moderation-api) (Explicit Nudity, Violence, Rude Gestures, etc) are found in the response, then the plugin restricts the playback of the video on-demand.
  - In order to restrict or allow, the workflow publishes an event to EventBridge default event bus.

The `downloader` Lambda function is written in Node.js and uses Graviton2 architecture. 

## Testing
Once you've deployed the plugin, you can test it by sending a sample event to the default EventBridge bus:

`aws events put-events --entries file://events/event.json`

If you then look at the Step Functions console for the latest execution, you will see the series of tasks getting executed finally publishing an event with a payload.