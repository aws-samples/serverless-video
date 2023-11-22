const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const formatDate = require('date-fns/format');
const addSeconds = require('date-fns/addSeconds');

const tableName = process.env.TABLE_NAME;

const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = parseInt((totalSeconds % 60).toFixed(0));
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};


const nthNumber = (number) => {
  if (number > 3 && number < 21) return `${number}th`;
  switch (number % 10) {
    case 1:
      return `${number}st`;
    case 2:
      return `${number}nd`;
    case 3:
      return `${number}rd`;
    default:
      return `${number}th`;
  }
};

// Create a DynamoDB client outside of the handler to optimize performance
const ddbClient = new DynamoDBClient({
  maxAttempts: 0, // disable automated retires, so that Lambda fails fast and relies on SQS retry capabilities.
});

const recordingStartToHistoryEvent = (event) => {
  const { detail } = event;

  return [
    {
      PK: detail?.stream_id,
      videoId: detail?.stream_id,
      type: 'service',
      icon: 'ivs',
      key: 'BroadcastStarted',
      title: 'Amazon IVS',
      subtitle: 'Broadcast started',
      description: `Broadcast started at ${formatDate(new Date(event.time), 'pp')} on the ${formatDate(new Date(event.time), 'LLLL yyyy')}.`,
      createdAt: event.time,
    },
  ];
};

const recordingEndToHistoryEvent = (event) => {
  const { detail } = event;

  return [
    {
      PK: detail?.stream_id,
      videoId: detail?.stream_id,
      type: 'service',
      icon: 'ivs',
      key: 'BroadcastEnded',
      title: 'Amazon IVS',
      subtitle: 'Broadcast ended',
      description: `Broadcast finished at ${formatDate(new Date(event.time), 'pp')}. IVS service emits an event into the default event bus.`,
      createdAt: event.time,
    },
    {
      PK: detail?.stream_id,
      videoId: detail?.stream_id,
      type: 'service',
      icon: 's3',
      title: 'Amazon S3',
      subtitle: 'Stream information uploaded to S3',
      key: 'StreamUploadedToS3',
      description: `IVS stream files are uploaded to S3. Thumbnails are generated for the video.`,
      createdAt: addSeconds(new Date(event.time), 1).toISOString(),
    },
    {
      PK: detail?.stream_id,
      videoId: detail?.stream_id,
      type: 'service',
      icon: 'eventbridge',
      title: 'Amazon EventBridge',
      subtitle: 'IVS emits a Recording End event',
      key: 'RecordingReadyEventFromIVS',
      description: `IVS raises a 'Recording End' event into the default event bus.`,
      createdAt: addSeconds(new Date(event.time), 2).toISOString(),
    },
    {
      PK: detail?.stream_id,
      videoId: detail?.stream_id,
      type: 'service',
      icon: 'eventbridge-rule',
      title: 'EventBridge Rule',
      subtitle: 'Consumer configured',
      key: 'RecordingReadyEventFromIVSConsumer',
      description: `'Recording Ready' event is consumed by a Step Functions workflow to process the files into an Mp4 file.`,
      createdAt: addSeconds(new Date(event.time), 3).toISOString(),
    },
  ];
};

const lifeCycleStartedToHistoryEvent = (event) => {
  const { detail } = event;

  return [
    {
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      icon: 'sfn',
      key: 'LifeCycleStarted',
      title: 'AWS Step Functions',
      subtitle: 'Started to process video',
      description: `Started to process video at ${formatDate(new Date(event.time), 'pp')}. This ran through the configured plugins for the video processing.`,
      createdAt: event.time,
    },
  ];
};

const mp4ProcessingStartedToHistoryEvent = (event) => {
  const { detail } = event;

  return [
    {
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      icon: 'sfn',
      key: 'MP4ProcessingStarted',
      title: 'AWS Step Functions',
      subtitle: 'Dynamic compute selection with Lambda or ECS',
      description: `Started to process raw ts files from IVS at ${formatDate(new Date(event.time), 'pp')}. Depending on the duration the correct compute will be used.`,
      createdAt: event.time,
    },
  ];
};

const mp4ProcessingCompleteToHistoryEvent = (event) => {
  const { detail } = event;

  const description =
    detail?.compute === 'lambda'
      ? `Finished converting video to MP4 with Lambda at ${formatDate(new Date(event.time), 'pp')} on the ${formatDate(
          new Date(event.time),
          'LLLL yyyy'
        )}. Lambda was used as video was less than 20 minutes`
      : `Finished converting video to MP4 with ECS at ${formatDate(new Date(event.time), 'pp')} on the ${formatDate(
          new Date(event.time),
          'LLLL yyyy'
        )}. The video was longer than 20 minutes so ECS was used.`;

  return [
    {
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      key: 'MP4ProcessingComplete',
      parent: 'MP4ProcessingStarted',
      icon: detail?.compute,
      title: detail?.compute === 'lambda' ? 'AWS Lambda' : 'Amazon ECS',
      subtitle: `Finished processing video with ${detail?.compute === 'lambda' ? 'Lambda' : 'ECS'}.`,
      description,
      createdAt: event.time,
    },
    
    {
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      key: 'MP4ProcessingCompleteStoreVideoInDynamoDB',
      parent: 'MP4ProcessingStarted',
      icon: 'dynamodb',
      title: 'Amazon DynamoDB',
      subtitle: 'Add video to video table',
      description: 'New video entry is stored into the videos DynamoDB table.',
      createdAt: addSeconds(new Date(event.time), 1).toISOString(),
    },
    {
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      key: 'MP4ProcessingCompleteEventBridgeEvent',
      parent: 'MP4ProcessingStarted',
      icon: 'eventbridge',
      title: 'Amazon EventBridge',
      subtitle: 'RecordingReady event',
      description: 'Downstream consumers are notified that the recording is now ready.',
      createdAt: addSeconds(new Date(event.time), 2).toISOString(),
    },
  ];
};
const lifeCycleCompleteToHistoryEvent = (event) => {
  const { detail } = event;

  const { plugins: { preValidate = [], postValidate = [], preMetadata = [], postMetadata = [] } = {} } = detail;
  const totalNumberOfPlugins = preValidate.length + postValidate.length + preMetadata.length + postMetadata.length;

  console.log('lifeCycleCompleteToHistoryEvent', JSON.stringify(event, null, 4));

  const durationPlugin = preValidate.find((plugin) => plugin.OutputKey === 'plugin-duration_plugin');
  const contentModerationPlugin = preValidate.find((plugin) => plugin.OutputKey === 'plugin-content_moderation_plugin');
  const tagPlugin = postMetadata.find((plugin) => plugin.OutputKey === 'plugin-generateTagsPlugin');
  const titlePlugin = postMetadata.find((plugin) => plugin.OutputKey === 'plugin-generateTitlePlugin');
  const transcribePlugin = preMetadata.find((plugin) => plugin.OutputKey === 'plugin-transcribeplugin');
  const leaderboardPlugin = postMetadata.find((plugin) => plugin.OutputKey === 'plugin-leaderboardPlugin');
  const rollupStatusPlugin = postMetadata.find((plugin) => plugin.OutputKey === 'plugin-rollupStats');

  const messages = [
    {
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      icon: 'sfn',
      key: 'LifeCycleComplete',
      title: 'AWS Step Functions',
      subtitle: 'Finished processing video',
      description: `Finished processing video at ${formatDate(new Date(event.time), 'pp')}.`,
      createdAt: event.time,
    },
    {
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      key: 'LifeCycleCompleteEventRaised',
      icon: 'eventbridge',
      title: 'Amazon EventBridge',
      subtitle: `Tell downstream consumers video is ready`,
      description:`A 'LifeCycleComplete' event is raised. This tells downstream consumers that a new serverlessVideo is ready.`,
      createdAt: addSeconds(new Date(event.time), 2).toISOString(),
    },
    {
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      key: 'ConsumedByIotCore',
      icon: 'iot-core',
      title: 'AWS IoT Core',
      subtitle: `Notify frontend applications`,
      description:`Notify all connected applications that a new video is ready to watch.`,
      createdAt: addSeconds(new Date(event.time), 3).toISOString(),
    },
    {
      PK: detail?.id,
      videoId: detail?.id,
      type: 'metric',
      key: 'NumberOfPlugins',
      label: 'Number of plugins',
      value: `${totalNumberOfPlugins}`,
      // createdAt has to be unqiue as its the SK... so just add a second on metrics only
      createdAt: addSeconds(new Date(event.time), 4).toISOString(),
    },
    {
      PK: detail?.id,
      videoId: detail?.id,
      type: 'metric',
      key: 'DurationOfVideo',
      label: 'Duration of video',
      value: `${formatTime(detail?.durationmillis / 1000)}`,
      // createdAt has to be unqiue as its the SK... so just add a second on metrics only
      createdAt: addSeconds(new Date(event.time), 5).toISOString(),
    },
  ];

  if (contentModerationPlugin) {
    const isValid = contentModerationPlugin?.OutputValue?.valid || false;

    messages.push({
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      icon: 'rekognition',
      key: 'LifeCycleCompleteContentModerationPlugin',
      parent: 'LifeCycleStarted',
      title: 'Amazon Rekognition',
      subtitle: `Plugin: Content moderation`,
      description: `Amazon Rekognition was used on the video to verify the contents. ${isValid ? 'This video passed the validation steps.' : 'This video failed the validation steps.'} `,
      createdAt: addSeconds(new Date(event.time), 6).toISOString(),
    });
  }

  if (durationPlugin) {
    const isValid = durationPlugin?.OutputValue?.valid || false;

    messages.push({
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      icon: 'lambda',
      key: 'LifeCycleCompleteDurationPlugin',
      parent: 'LifeCycleStarted',
      title: 'AWS Lambda',
      subtitle: `Plugin: Content duration`,
      description: `Videos will only process if they are certain duration. ${isValid ? 'This video passed the duration validation' : 'This video failed the duration validation.'}`,
      createdAt: addSeconds(new Date(event.time), 7).toISOString(),
    });
  }

  if (transcribePlugin) {
    messages.push({
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      icon: 'transcribe',
      key: 'LifeCycleCompleteTranscribePlugin',
      parent: 'LifeCycleStarted',
      title: 'Amazon Transcribe',
      subtitle: `Plugin: Transcribe video`,
      description: `Amazon Transcribe was used on this video to automatically transcribe the video into text, and displayed for viewers.`,
      createdAt: addSeconds(new Date(event.time), 8).toISOString(),
    });
  }

  // If the tag plugin ran and we have tags
  if (tagPlugin) {
    console.log('TAG PLUGIN', JSON.stringify(tagPlugin, null, 4));
    const tags = tagPlugin?.OutputValue?.pluginData?.tags || [];
    messages.push({
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      icon: 'bedrock',
      key: 'LifeCycleCompleteTagsPlugin',
      parent: 'LifeCycleStarted',
      title: 'Amazon Bedrock',
      subtitle: `Plugin: Generate AI video tags`,
      description: `Amazon Bedrock was used to generate ${tags.length} tags from the video transcribe.`,
      createdAt: addSeconds(new Date(event.time), 9).toISOString(),
    });
    messages.push({
      PK: detail?.id,
      videoId: detail?.id,
      type: 'metric',
      key: 'AITagsGenerated',
      label: 'AI tags generated',
      value: `${tags.length}`,
      // createdAt has to be unqiue as its the SK... so just add a second on metrics only
      createdAt: addSeconds(new Date(event.time), 10).toISOString(),
    });
  }

  if (titlePlugin) {
    const title = titlePlugin?.OutputValue?.title || '';

    messages.push({
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      icon: 'bedrock',
      key: 'LifeCycleCompleteTitlePlugin',
      parent: 'LifeCycleStarted',
      title: 'Amazon Bedrock',
      subtitle: `Plugin: Generate AI video title`,
      description: `Using the video transcribe the title '${title}' for this video was generated using Amazon Bedrock.`,
      createdAt: addSeconds(new Date(event.time), 11).toISOString(),
    });
  }

  if (leaderboardPlugin) {
    console.log('leaderboardPlugin', leaderboardPlugin)
    const count = leaderboardPlugin?.OutputValue?.pluginData?.leaderboard?.streams?.count || '';

    messages.push({
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      icon: 'appsync',
      key: 'LifeCycleCompleteLeaderboardPlugin',
      parent: 'LifeCycleStarted',
      title: 'AWS AppSync',
      subtitle: `Plugin: Leaderboard plugin`,
      description: `This broadcaster has uploaded ${count} videos to serverlessVideo. The video was added to the leaderboard service.`,
      createdAt: addSeconds(new Date(event.time), 12).toISOString(),
    });
  }

  if (rollupStatusPlugin) {
    const totalVideoCount = rollupStatusPlugin?.OutputValue?.pluginData?.total_video_count || 0;
    const totalHoursOfVideo = rollupStatusPlugin?.OutputValue?.pluginData?.total_hours_of_video || 0;

    messages.push({
      PK: detail?.id,
      videoId: detail?.id,
      type: 'service',
      icon: 'dynamodb',
      key: 'LifeCycleCompleteRollupStatusPlugin',
      parent: 'LifeCycleStarted',
      title: 'Amazon DynamoDB',
      subtitle: `Plugin: serverlessVideo stats`,
      description: `At the date of this video processing, ${totalVideoCount} videos have been uploaded to serverlessVideo. ${totalHoursOfVideo.toFixed(
        2
      )} total hours of video have been uploaded to serverlessVideo. `,
      createdAt: addSeconds(new Date(event.time), 13).toISOString(),
    });

    messages.push({
      PK: detail?.id,
      videoId: detail?.id,
      type: 'metric',
      key: 'VideoCount',
      label: 'video uploaded',
      value: `${nthNumber(totalVideoCount)}`,
      // createdAt has to be unqiue as its the SK... so just add a second on metrics only
      createdAt: addSeconds(new Date(event.time), 14).toISOString(),
    });

    messages.push({
      PK: detail?.id,
      videoId: detail?.id,
      type: 'metric',
      key: 'TotalHoursOfVideo',
      label: 'hours uploaded',
      value: `${totalHoursOfVideo.toFixed(2)}`,
      // createdAt has to be unqiue as its the SK... so just add a second on metrics only
      createdAt: addSeconds(new Date(event.time), 15).toISOString(),
    });
  }

  messages.push({
    PK: detail?.id,
    videoId: detail?.id,
    type: 'service',
    icon: 'eventbridge',
    key: 'LifeCycleCompleteEventEmitted',
    parent: 'LifeCycleStarted',
    title: 'Amazon EventBridge',
    subtitle: `LifeCycleComplete event emitted`,
    description: `Event is emitted to notify downstream consumers and the UI that the video has finished being processed and plugins have been applied to the video.`,
    createdAt: addSeconds(new Date(event.time), 16).toISOString(),
  });

  return messages;
};

const convertEventToHistoryLog = (event) => {
  if (event['detail-type'] === 'IVS Recording State Change' && event.detail.recording_status === 'Recording Start') {
    return recordingStartToHistoryEvent(event);
  }
  if (event['detail-type'] === 'IVS Recording State Change' && event.detail.recording_status === 'Recording End') {
    return recordingEndToHistoryEvent(event);
  }
  if (event['detail-type'] === 'LifeCycleComplete') {
    return lifeCycleCompleteToHistoryEvent(event);
  }
  if (event['detail-type'] === 'LifeCycleStarted') {
    return lifeCycleStartedToHistoryEvent(event);
  }
  if (event['detail-type'] === 'MP4ProcessingStarted') {
    return mp4ProcessingStartedToHistoryEvent(event);
  }
  if (event['detail-type'] === 'MP4ProcessingComplete') {
    return mp4ProcessingCompleteToHistoryEvent(event);
  }
};

// const main = async (event = defaultEvent) => {
exports.lambdaHandler = async (event) => {
  console.log('Event', JSON.stringify(event, null, 4));

  // Process each message in the event
  for (const rec of event.Records) {
    try {
      const message = JSON.parse(rec.body);

      // Returns an array of historic logs to save
      const historicMessages = convertEventToHistoryLog(message);

      if (historicMessages) {
        for (const historicMessage of historicMessages) {
          console.log('Putting item', JSON.stringify(historicMessage, null, 4));
          await ddbClient.send(
            new PutItemCommand({
              TableName: tableName,
              Item: marshall(historicMessage),
            })
          );
        }
      }
    } catch (e) {
      // If there was an error report the current record and the rest to SQS
      const failures = event.Records.slice(event.Records.indexOf(rec)).map((r) => ({ itemIdentifier: r.messageId }));
      console.log(e.message);
      console.warn('Failed to process ' + failures.length + ' items: ' + JSON.stringify(failures));
      return {
        batchItemFailures: failures,
      };
    }
  }

  console.log('Successfully processed ' + event.Records.length + ' items');
  // No failures to report
  return {
    batchItemFailures: [],
  };
};

// main();
