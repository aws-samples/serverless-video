const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');

// Define allow-list of trusted CloudFront hostnames (use actual distribution domains you control)
const ALLOWED_CLOUDFRONT_HOSTNAMES = [
  "YOUR_DISTRIBUTION.cloudfront.net",
  // You can add more trusted hostnames here
];

const destinationBucketName = process.env.BucketName;
const s3 = new S3Client({ region: process.env.AWS_REGION });

// Helper function to validate CloudFront URLs
function isValidCloudFrontUrl(urlString) {
  try {
    const url = new URL(urlString);
    // Only allow HTTPS
    if (url.protocol !== "https:") return false;
    // Only allow trusted CloudFront distribution domains
    if (!ALLOWED_CLOUDFRONT_HOSTNAMES.includes(url.hostname)) return false;
    // Optionally, validate path or other properties
    return true;
  } catch (e) {
    return false;
  }
}

exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 4));

  const cloudFrontUrl = event.detail.video.playbackUrl;
  // Split the string using the delimiter '/'
  const urlParts = cloudFrontUrl.split('ivs/');
  
  // Get the last item (which is the object key)
  const destinationKey = urlParts[1];

  if (!isValidCloudFrontUrl(cloudFrontUrl)) {
    console.error('Invalid CloudFront URL:', cloudFrontUrl);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid or untrusted CloudFront URL.' }),
    };
  }

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
