const { faker } = require('@faker-js/faker');
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
  const awsName = awsUsernames[Math.floor(Math.random()*awsUsernames.length)];
  const username = `${awsName}${faker.number.int({max: 1000})}`;
  return {
    username
  };
};