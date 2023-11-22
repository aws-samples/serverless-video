import { Cluster } from 'ioredis';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { formatUrl } from '@aws-sdk/util-format-url';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { loadEnvVar } from './util';

const env = {
  cacheEndpoint: loadEnvVar('CACHE_ENDPOINT'),
  cacheClusterName: loadEnvVar('CACHE_CLUSTER_NAME'),
  cachePort: loadEnvVar('CACHE_PORT'),
  cacheUser: loadEnvVar('CACHE_USER'),
  region: loadEnvVar('AWS_REGION')
};

// @see https://docs.aws.amazon.com/memorydb/latest/devguide/auth-iam.html
// @see https://github.com/aws/aws-sdk/issues/556
// @see https://github.com/aws-samples/elasticache-iam-auth-demo-app
const getAuthToken = async(): Promise<string> => {
  const signer = new SignatureV4({
    service: 'memorydb',
    region: env.region,
    credentials: fromNodeProviderChain(),
    sha256: Sha256
  });

  const protocol = 'https';

  const presigned = await signer.presign({
    method: 'GET',
    protocol,
    hostname: env.cacheClusterName,
    path: '/',
    query: {
      Action: 'connect',
      User: env.cacheUser
    },
    headers: {
      host: env.cacheClusterName
    }
  }, { expiresIn: 900 });

  const token = formatUrl(presigned).replace(`${protocol}://`, '');

  return token;
};

const token = await getAuthToken();

const redisClient = new Cluster(
  [
    {
      host: env.cacheEndpoint,
      port: parseInt(env.cachePort),
    }
  ],
  {
    dnsLookup: (address, callback) => callback(null, address),
    redisOptions: {
      username: env.cacheUser,
      password: token,
      tls: {}
    }
  }
);

export {
  redisClient
};