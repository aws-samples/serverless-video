import { fromEnv } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { Context } from 'aws-lambda';
import axios from 'axios';
import { loadEnvVar } from './common/util';
import { LeaderType } from './common/constants';
import { Leaderboard } from './common/serverlessVideo';

/**
 * AppSync data source function. Calls VPC Lattice service to retrieve
 * leaderboard data.
 */

const env = {
  pluginName: loadEnvVar('PLUGIN_NAME'),
  endpoint: loadEnvVar('LEADERBOARD_SERVICE_ENDPOINT'),
  region: loadEnvVar('AWS_REGION')
};

interface ListLeadersPayload {
  by: LeaderType
  limit: number
  nextToken?: string
}

const listLeaders = async(by: string = LeaderType.DURATION, limit: number = 10, nextToken: string = ''): Promise<Leaderboard> => {
  const endpoint = new URL(env.endpoint);
  const signer = new SignatureV4({
    service: 'vpc-lattice-svcs',
    region: env.region,
    credentials: fromEnv(),
    sha256: Sha256
  });

  const signedRequest = await signer.sign({
    method: 'GET',
    hostname: endpoint.host,
    path: endpoint.pathname,
    protocol: endpoint.protocol,
    headers: {
      'Content-Type': 'application/json',
      host: endpoint.hostname,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'
    },
    query: {
      by,
      limit: limit.toString(),
      nextToken
    }
  });

  // Delete the query params from the request and include when we make the request.
  // This fixes what seems to be a mismatch problem in how the signer and axios library
  // treat (or call) query string parameters.
  delete signedRequest['query'];
  
  const { data } = await axios({
    ...signedRequest,
    url: env.endpoint,
    params: {
      by,
      limit,
      nextToken
    }
  });

  console.info('Received response', JSON.stringify(data));

  return data;
};

export const handler = async(event: ListLeadersPayload, _:Context): Promise<Leaderboard> => {
  console.log(JSON.stringify(event));

  let result:Leaderboard = { items: [], nextToken: undefined };

  try {
    result = await listLeaders(event.by, event.limit, event.nextToken);
    result.items.forEach(r => {
      // TODO: fix this, not great....
      r['__typename'] = event.by === LeaderType.DURATION ? 'DurationEntry' : 'StreamsEntry';
    });
  } catch (error) {
    console.error(error);
  }

  return result;
};
