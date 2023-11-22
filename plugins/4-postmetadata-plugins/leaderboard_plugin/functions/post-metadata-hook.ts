import { fromEnv } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { Context, EventBridgeEvent } from 'aws-lambda';
import { EventBridgeClient, PutEventsCommand, PutEventsRequestEntry } from '@aws-sdk/client-eventbridge';
import axios from 'axios';
import { loadEnvVar } from './common/util';
import { serverlessVideoDetail } from './common/serverlessVideo';

const client = new EventBridgeClient();

const env = {
  pluginName: loadEnvVar('PLUGIN_NAME'),
  endpoint: loadEnvVar('LEADERBOARD_SERVICE_ENDPOINT'),
  region: loadEnvVar('AWS_REGION')
};

interface LeaderboardResponse {
  channelId: string
  duration: {
    total: string
    rank: number
  }
  streams: {
    count: string
    rank: number
  }
}

const updateLeaderBoardData = async(channelId: string, author: string, duration: number): Promise<LeaderboardResponse | null> => {
  try {
    const endpoint = new URL(env.endpoint);
    const signer = new SignatureV4({
      service: 'vpc-lattice-svcs',
      region: env.region,
      credentials: fromEnv(),
      sha256: Sha256
    });

    const signedRequest = await signer.sign({
      method: 'PUT',
      hostname: endpoint.host,
      path: endpoint.pathname,
      protocol: endpoint.protocol,
      headers: {
        'Content-Type': 'application/json',
        host: endpoint.hostname,
        // Include following header as VPC Lattice does not support signed payloads right now.
        // SigV4 library in JS also does not support this as a signing option here, so forcing the
        // header.
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'
      }
    });
    
    const { data } = await axios({
      ...signedRequest,
      // for now, just pass the channel name and duration for counting
      data: {
        channelId,
        author,
        duration
      },
      url: env.endpoint
    });

    console.info('Received response', { data });

    return data;
  } catch (error) {
    console.error(error);

    return null;
  }
};

const putResultEvent = async(taskToken: string, leaderboard: LeaderboardResponse): Promise<void> => {
  const eventToPublish: PutEventsRequestEntry = {
    Detail: JSON.stringify({ TaskToken: taskToken, Message: { pluginData: { leaderboard } } }),
    DetailType: 'plugin-complete',
    EventBusName: 'default',
    Source: `serverlessVideo.plugin.${env.pluginName}`
  };

  console.log(eventToPublish);

  const cmd = new PutEventsCommand({
    Entries: [
      eventToPublish
    ]
  });
  
  await client.send(cmd);
  
  return;
};

export const handler = async(event: EventBridgeEvent<'serverlessVideoDetail', serverlessVideoDetail>, _:Context): Promise<LeaderboardResponse | null> => {
  console.debug(JSON.stringify(event));

  const videoData = event.detail.video;

  try {
    // update the leaderboard
    const result = await updateLeaderBoardData(
      videoData.channel,
      videoData.author.username,
      videoData.durationmillis
    );
    
    if (result) {
      // publish completion of the plugin
      await putResultEvent(event.detail.taskToken, result);
      console.info(result);
      return result;
    }
  } catch (error) {
    console.error(error);
  }
  return null;
};
