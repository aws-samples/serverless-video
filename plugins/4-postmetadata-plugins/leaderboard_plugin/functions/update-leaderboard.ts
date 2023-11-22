import { Context } from 'aws-lambda';
import { VpcLatticeEvent, VpcLatticeHandler, VpcLatticeResult } from './common/vpc-lattice';
import { redisClient } from './common/redis-client';
import { LEADERBOARD_KEY, LeaderType } from './common/constants';
import { encodeChannelId } from './common/util';

export const handler: VpcLatticeHandler = async (event: VpcLatticeEvent, _: Context): Promise<VpcLatticeResult> => {
  if (!event.body) {
    throw new Error('Event does not contain input');
  }

  const input = JSON.parse(event.body);
  console.debug(input);

  let result = { statusCode: 400, body: '' };

  const channelId = encodeChannelId(input.channelId, input.author.username);

  try {
    // Increment the total duration streamed by the channel in leaderboard
    const totalDuration = await redisClient.zincrby(
      `${LEADERBOARD_KEY}:${LeaderType.DURATION}`,
      input.duration,
      channelId
    );

    // Increment the number of streams by the channel
    const totalStreams = await redisClient.zincrby(
      `${LEADERBOARD_KEY}:${LeaderType.STREAMS}`,
      1,
      channelId
    );

    // Get updated ranks for response
    const rankDuration = await redisClient.zrevrank(
      `${LEADERBOARD_KEY}:${LeaderType.DURATION}`,
      channelId
    );
    const rankStreams = await redisClient.zrevrank(
      `${LEADERBOARD_KEY}:${LeaderType.STREAMS}`,
      channelId
    );

    result = {
      statusCode: 200,
      body: JSON.stringify({
        channelId: input.channelId,
        username: input.author.username,
        duration: {
          total: totalDuration,
          rank: rankDuration
        },
        streams: {
          count: totalStreams,
          rank: rankStreams
        }
      })
    };
  } catch (error) {
    console.error(error);
    result.body = JSON.stringify(error);
  }
  
  console.info('Calculated leaderboard', { result });

  return (result); 
};
