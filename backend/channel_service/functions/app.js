const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

  const params = {
    TableName: 'serverlessVideo-channels-table',
    FilterExpression: '#L = :val',
    ExpressionAttributeNames: {
      '#L': 'Live',
    },
    ExpressionAttributeValues: {
      ':val': { BOOL: true },
    },
  };

  try {
    const data = await dynamodb.scan(params).promise();

    const items = data.Items.map((item) => AWS.DynamoDB.Converter.unmarshall(item));

    const response = {
      statusCode: 200,
      body: JSON.stringify(items),
    };

    return response;
  } catch (error) {
    console.error('Error:', error);

    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: 'An error occurred' }),
    };

    return response;
  }
};
