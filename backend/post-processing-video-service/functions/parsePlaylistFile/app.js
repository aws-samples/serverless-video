const { S3Client, PutObjectCommand,GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const ffmpegPath = '/opt/bin/ffmpeg'; // Corrected path
const ffmpeg = require('fluent-ffmpeg');
const exec = require('child_process').exec;
ffmpeg.setFfmpegPath(ffmpegPath);
const s3Client = new S3Client(); // Replace 'your-region' with the actual region


exports.handler = async (event) => {


console.log(event)

  const inputBucket = process.env.SourceBucket;
  const outputBucket =process.env.DestinationBucket
  const fileKey= `${event.BatchInput.detail.recording_s3_key_prefix}/media/hls/720p30/`
  const inputPlaylistKey = 'testing/'

  const TSArray = extractFileNames(event.Items);
  const mp4Number = getCurrentChunkIndex(TSArray,event.BatchInput.total)



  const promises = TSArray.map(async line => {
    const tsFileName = line.trim();
    const tmpFilePath = await downloadAndStoreFile(inputBucket, fileKey, tsFileName);
    console.log("TS file saved to tmp:", tsFileName);
    return '/tmp/' + tsFileName;
  });
  
  // Wait for all promises to resolve
  const tmpTSarray = await Promise.all(promises);
  const outputFileName = `output-${mp4Number}.mp4`;
  const outputFilePath = path.join('/tmp', outputFileName);

  //now start teh conversion
  console.log('Starting conversion...');

  console.log('the inputs',tmpTSarray.join(' '))

  const filterComplex = tmpTSarray.map((file, index) => `[${index}:v] [${index}:a]`).join(' ');
  const ffmpegCommand = `ffmpeg ${tmpTSarray.map(file => `-i ${file}`).join(' ')} -filter_complex "${filterComplex} concat=n=${tmpTSarray.length}:v=1:a=1 [v] [a]" -map "[v]" -map "[a]" ${outputFilePath}`;


  try {
    await new Promise((resolve, reject) => {
      const childProcess = exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          console.error('Error:', error);
          reject(error);
        } else {
          console.log('Concatenation completed');
          resolve();
        }
      });

      childProcess.stderr.on('data', (data) => {
        console.error('FFmpeg STDERR:', data);
      });
    });

    console.log('Uploading the converted file to S3...');

    try {
      // Read the source file
      const fileContent = fs.readFileSync(outputFilePath);
      // Prepare the S3 upload parameters
      const params = {
          Bucket: outputBucket,
          Key: `prepocessing/${fileKey}${outputFileName}`,
          Body: fileContent
      };
      // Upload the file to S3
      const command = new PutObjectCommand(params);
      await s3Client.send(command);
      console.log('uploaded to S3')
    } catch (error) {
        console.error('Error:', error);
    }
    return {
      statusCode: 200,
      iteration:mp4Number,
      mp4:`prepocessing/${fileKey}${outputFileName}`
    }
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Started Too early, try again in 5 seconds');
  }
};



  



// Create a function to download and store the file
async function downloadAndStoreFile(bucketName, fileKey, tsFileName) {
  const downloadPath = path.join("/tmp", tsFileName);

  try {
    console.log('saving file to tmp', tsFileName);
    const getObjectCommand = new GetObjectCommand({ Bucket: bucketName, Key: fileKey + tsFileName });
    const response = await s3Client.send(getObjectCommand);

    // Save the file locally
    const fileStream = fs.createWriteStream(downloadPath);
    console.log('created write stream')
    // Return a promise that resolves when the file stream is finished writing
    return new Promise((resolve, reject) => {
      response.Body.pipe(fileStream);
      console.log('inside the pipe')
      fileStream.on("finish", () => {
        console.log("File downloaded successfully:", downloadPath);
        resolve(downloadPath);
      });
      fileStream.on("error", reject);
    });
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}


function extractFileNames(inputArray) {
  const cleanArray = [];

  for (const item of inputArray) {
    // Use regular expressions to extract the file name
    const match = item.ContextValue.match(/\n(\d+\.ts)/);
    if (match && match[1]) {
      cleanArray.push(match[1]);
    }
  }

  return cleanArray;
}

function getCurrentChunkIndex(TSarray, total) {
  const itemsPerChunk = 10;
  
  // Calculate the index of the first item in the TSarray
  const firstItemIndex = parseInt(TSarray[0].split('.')[0]);

  // Calculate the chunk index based on the first item's index and itemsPerChunk
  const chunkIndex = Math.floor(firstItemIndex / itemsPerChunk);

  return chunkIndex;
}