const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const ssmClient = new SSMClient();
const axios = require('axios');
const maxTokens = 40;
const model = 'anthropic.claude-v2';
const baseUrl = process.env.baseURL;

const s3Client = new S3Client();

exports.handler = async (event) => {



  // Retrieve S3 bucket and object details
    const transcribeUrl = event.detail.pluginData.preMetadata[0].OutputValue.TranscriptFilePointers.TranscriptFileUri
    const getbucketAndKeyObj = getbucketAndKey(transcribeUrl)
    const fileContents = await getFileContents(getbucketAndKeyObj.bucket, getbucketAndKeyObj.key);
    const json = JSON.parse(fileContents);
    const transcript =json.results.transcripts[0].transcript

  

  const parameterName = process.env.serverlessVideoGenAIKeySSMParameter;
  const api_key_response = await ssmClient.send(
    new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    })
  );

  const apiKey = api_key_response.Parameter.Value;

  const maxTranscriptLength = 400; // Maximum length of transcript in words
  let prompt = '';
  if (transcript.split(' ').length > maxTranscriptLength) {
    // Truncate the transcript to the maximum length
    const words = transcript.split(' ').slice(0, maxTranscriptLength);
    const truncatedTranscript = words.join(' ');
    prompt = `generate a video title that does not contain any offensive words, for the following truncated transcript:"${truncatedTranscript}..."`;
  } else {
    prompt = `generate a video title that does not contain any offensive words, for the following transcript:"${transcript}".`;
  }

  // Call Bendrock to generate the video title
  const response = await generatetitle(apiKey, prompt);

  console.log(response.data.choices);
  let videoTitle = response.data.choices[0].message.content;

  //console.log('videoTitle response', videoTitle);

  if (videoTitle.includes(':')) {
    const videoTitleArray = videoTitle.split(':');
    videoTitle = videoTitleArray[1];
  }

  return {
    statusCode: 200,
    body: videoTitle.trim().replace(/\"/g, ''),
  };
};

async function generatetitle(apiKey, prompt) {
  const response = await axios.post(
    `${baseUrl}/v1/chat/completions`,
    {
      model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );
  return response;
}




async function getFileContents(bucketName, objectKey) {
  const s3Client = new S3Client();

  const getObjectParams = {
    Bucket: bucketName,
    Key: objectKey,
  };

  try {
    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const response = await s3Client.send(getObjectCommand);

    // Convert the response stream to a string
    const fileContents = await streamToString(response.Body);

    // Log or use the file contents as needed
    console.log('File Contents:', fileContents);

    return fileContents;
  } catch (error) {
    console.error('Error getting file contents:', error);
    throw error; // Rethrow the error for handling at the caller level
  }
}


// Helper function to convert the stream to a string
async function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    stream.on('error', (error) => reject(error));
  });
}


function getbucketAndKey(uri){

  const bucketArr =  uri.split('/ivs');
  const bucketArr2 =bucketArr[0].split('.com/')
  return {"bucket":bucketArr2[1],"key":"ivs"+bucketArr[1]}
}

