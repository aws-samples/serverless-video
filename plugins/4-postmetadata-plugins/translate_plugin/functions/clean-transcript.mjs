import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const client = new S3Client({ region: process.env.AWS_REGION });

// @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/example_s3_GetObject_section.html
export const handler = async(event) => {
  console.log(JSON.stringify(event));

  const getObj = new GetObjectCommand({
    Bucket: event.transcript.orig.bucket,
    Key: event.transcript.orig.key
  });
  
  console.log(JSON.stringify(getObj));

  try {
    const resp = await client.send(getObj);
    const transcriptJson = await resp.Body.transformToString();

    let transcript;
    if (transcriptJson) {
      transcript = JSON.parse(transcriptJson);
    }

    const blob = new Blob([transcript.results.transcripts[0].transcript], { type: 'text/plain' });
    let arrayBuffer = await blob.arrayBuffer();
    
    const pubObj = new PutObjectCommand({
      Bucket: event.transcript.orig.bucket,
      Key: `input/${event.job.id}/transcript.txt`,
      Body: Buffer.from(arrayBuffer)
    });

    await client.send(pubObj);
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }

  return {
    bucket: event.transcript.orig.bucket,
    key: `input/${event.job.id}/transcript.txt`,
    jobid: event.job.id
  };
};
