import { Context } from 'aws-lambda';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import { VpcLatticeEvent, VpcLatticeEventV1, VpcLatticeEventV2, VpcLatticeHandler, VpcLatticeResult } from './common/vpc-lattice';
import { redisClient } from './common/redis-client';
import { LeaderboardEntry } from './common/serverlessVideo';
import { LeaderType } from './common/constants';
import { decodeChannelId } from './common/util';
import { logger, tracer } from './common/powertools';

const decodeNextToken = (nextToken:string): number => {
  const str = Buffer.from(nextToken, 'base64').toString('ascii');

  return parseInt(str.split(':')[1]);
};

const encodeNextToken = (nextIndex:number): string =>
  Buffer.from(`leaderboard:${nextIndex}`).toString('base64');

const DEFAULT_NEXT_TOKEN = encodeNextToken(0);

const getQueryParamOrDefault = (event: VpcLatticeEvent, name: string, defaultValue: string): string => {
  // check if the event payload is v1 or v2 to get the query string params
  // v2 structure, values are in array, we'll pick the first...
  const qs = ('version' in event) ?
    (event as VpcLatticeEventV2).queryStringParameters : (event as VpcLatticeEventV1).query_string_parameters;

  const val = (qs && name in qs) ? qs[name] : defaultValue;

  return Array.isArray(val) ? val[0] : val || defaultValue;
};

/**
 * 
 * @param event 
 * @param _ 
 * @returns 
 */
const lambdaHandler: VpcLatticeHandler = async (event: VpcLatticeEvent, _: Context): Promise<VpcLatticeResult> => {
  logger.debug('Incoming event ', { event });

  const by = getQueryParamOrDefault(event, 'by', LeaderType.STREAMS);
  const limit = Number(getQueryParamOrDefault(event, 'limit', '10'));
  const nextToken = getQueryParamOrDefault(event, 'nextToken', DEFAULT_NEXT_TOKEN);

  const nextIndex = decodeNextToken(nextToken);

  let result = { statusCode: 400, body: '' };

  // Get updated ranks
  try {
    tracer.putAnnotation('by', by);
    tracer.putAnnotation('limit', limit);

    const parentSegment = tracer.getSegment();
    let subsegment;
    if (parentSegment) {
      subsegment = parentSegment.addNewSubsegment('## load_leaderboard');
      tracer.setSegment(subsegment);
    }

    // TODO: Calculate if there are actually more entries or not
    const data = await redisClient.zrevrange(`leaderboard:${by}`, nextIndex, nextIndex + limit, 'WITHSCORES');

    if (parentSegment && subsegment) {
      subsegment.close();
      tracer.setSegment(parentSegment);
    }

    // redis returns an array in form of: [ 'f841b370-a081-70bd-e170-6daff572cada', '5', 'g841b370-a081-70bd-e170-6daff572cada', '5' ]
    // need to adjust format to match GraphQL API
    const items:LeaderboardEntry[] = data.reduce((acc:LeaderboardEntry[], curr, idx) => {
      if (idx % 2 != 0) { return acc; }

      const { channelId, username } = decodeChannelId(curr);

      const entry: LeaderboardEntry = { channel: channelId, username, rank: Number(acc.length+1) };

      if (LeaderType.DURATION === by)
        entry['totalSeconds'] = Number(data[idx+1]);
      else
        entry['count'] = Number(data[idx+1]);

      acc.push(entry);
      
      return acc;
    }, []);
  
    result = {
      statusCode: 200,
      body: JSON.stringify({
        items,
        nextToken: encodeNextToken(nextIndex + limit + 1)
      })
    };
  } catch (error) {
    logger.error('Error while generating leaderboard', { error });
    tracer.addErrorAsMetadata(error as Error);
    result.body = JSON.stringify(error);
  }

  logger.debug('Current leaderboard', { result });

  return (result);
};

export const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer));
