const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');

const destinationBucketName = process.env.BucketName;
const s3 = new S3Client({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 4));

  const cloudFrontUrl = event.detail.video.playbackUrl;
  // Split the string using the delimiter '/'
  const urlParts = cloudFrontUrl.split('ivs/');
  
  // Get the last item (which is the object key)
  const destinationKey = urlParts[1];

  try {
    // Download the object from CloudFront using axios
    const response = await axios.get(cloudFrontUrl, { responseType: 'arraybuffer' });
    const cloudFrontObject = response.data;

    // Save the object to the destination S3 bucket
    await s3.send(
      new PutObjectCommand({
        Bucket: destinationBucketName,
        Key: destinationKey,
        Body: cloudFrontObject,
      })
    );

    console.log('Object downloaded from CloudFront and saved to S3 successfully.');

    return {
      statusCode: 200,
      body: destinationKey,
    };
  } catch (error) {
    console.error('Error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error downloading and saving the object.' }),
    };
  }
};
