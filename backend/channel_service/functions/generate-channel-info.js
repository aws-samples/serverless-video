const { faker } = require('@faker-js/faker');
const crypto = require('crypto');
const awsUsernames = [
  "LambdaLancer",
  "S3Sorcerer",
  "DynamoDazzler",
  "EC2Enchanter",
  "RDSRanger",
  "GlueGuru",
  "CloudFrontCrusader",
  "KinesisKnight",
  "AthenaAdventurer",
  "ElasticBeanstalkEmissary",
  "RedshiftRaider",
  "IAMIcon",
  "VPCVanguard",
  "StepFunctionSage",
  "SageMakerSorceress",
  "ElasticCacheExplorer",
  "Route53Rogue",
  "SQSSpellbinder",
  "CloudWatchWarden",
  "AppSyncAdept",
  "EventBridgeEnvoy",
  "ApiGatewayGladiator",
  "SNSShaman"
];

exports.handler = async () => {
  const awsName = awsUsernames[crypto.randomInt(awsUsernames.length)];
  const username = `${awsName}${crypto.randomInt(1000)}`;
  return {
    username
  };
};