const { S3Client, PutObjectCommand,GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const ffmpegPath = '/opt/bin/ffmpeg'; // Corrected path
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const s3Client = new S3Client(); // Replace 'your-region' with the actual region


exports.handler = async (event) => {



console.log(event)
  const inputPlaylistKey = `${event.detail.recording_s3_key_prefix}/media/hls/720p30/`
  const masterPlaylistKey = `${event.detail.recording_s3_key_prefix}/media/hls/master.m3u8`
  const thumbnailKey = `${event.detail.recording_s3_key_prefix}/media/thumbnails/thumb0.jpg`
  // Remove trailing and leading single quotes


  const inputBucket = process.env.SourceBucket;
  const outputBucket =process.env.DestinationBucket
  const example =process.env.DestinationBucket
  const cdnUrl= process.env.cdnUrl

  //first make sure /tmp dir is empty, incase this function execution env has already been used.
  cleanTmpDirectory();


  // first we download the playlist file
    const downloadedFilePath = await downloadAndStoreFile(inputBucket, inputPlaylistKey+'playlist.m3u8');
    console.log("Downloaded file location:", downloadedFilePath);
  // next we get a list of all the TS files, and save to /tmp
    const tsFileNames = await findTsWithinM3U8(inputBucket, downloadedFilePath,inputPlaylistKey);
    console.log("Found .ts file names:", tsFileNames);

  
  //now start teh conversion
  console.log('Starting conversion...');

  try {
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(downloadedFilePath)
        .output('/tmp/output.mp4')
        .on('end', () => {
          console.log('Conversion finished');
          resolve(); // Resolve the Promise when FFmpeg process is complete
        })
        .on('error', (err) => {
          console.error('Error:', err);
          reject(err); // Reject the Promise on error
        })
        .run(); // Start the FFmpeg process
    });

    console.log('Uploading the converted file to S3...');

    try {
      // Read the source file
      const fileContent = fs.readFileSync('/tmp/output.mp4');
      // Prepare the S3 upload parameters
      const params = {
          Bucket: outputBucket,
          Key: `${inputPlaylistKey}output.mp4`,
          Body: fileContent
      };
      // Upload the file to S3
      const command = new PutObjectCommand(params);
      await s3Client.send(command);
      console.log('uploaded to S3')
    } catch (error) {
        console.error('Error:', error);
    }

    cleanTmpDirectory();


    return {
      statusCode: 200,
      body:{ 
        playbackUrl: `https://${cdnUrl}/${inputPlaylistKey}output.mp4`,
        thumbnailUrl:`https://${cdnUrl}/${thumbnailKey}`,
        streamUrl:`https://${cdnUrl}/${masterPlaylistKey}`,
        height: '0',
        width:'0'
     }
    }
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Started Too early, try again in 5 seconds');
  }
};



// Create a function to download and store the file
async function downloadAndStoreFile(bucketName,fileKey) {

  const downloadPath = path.join("/tmp", path.basename(fileKey));

  try {
    console.log('saving file to tmp',fileKey )
    const getObjectCommand = new GetObjectCommand({ Bucket: bucketName, Key: fileKey });
    const response = await s3Client.send(getObjectCommand);
    
    // Save the file locally
    // Create a writable stream to save the file
    const fileStream = fs.createWriteStream(downloadPath);
    // Pipe the file data to the writable stream
    response.Body.pipe(fileStream);
    // Wait for the file to finish downloading
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });
    console.log("File downloaded successfully:", downloadPath);
    
    return downloadPath
  
  } catch (error) {
    console.error('Error:', error);
  }
}


// need the bucket name so we can call out to download the file
// playlistFilePath: Local playlist file in /tmo
// fileKey: The is the Key of the TS file up intil teh name
async function findTsWithinM3U8(bucketName,playlistFilePath,fileKey) {
  try {
    const playlistContent = fs.readFileSync(playlistFilePath, "utf-8");
    const lines = playlistContent.split("\n");

    const tsFiles0 = lines.filter(line => line.trim().endsWith(".ts"))

    const tsFiles =  await Promise.all(
         tsFiles0.map(async (line) =>  {
          const tsFileName = line.trim();
          await downloadAndStoreFile(bucketName, fileKey+tsFileName)
          console.log("TS files saved to tmp", fileKey+tsFileName);
          return tsFileName;
        })
      )

    return tsFiles;
  } catch (error) {
    console.error("Error reading or parsing playlist:", error);
    throw error;
  }
}



// Function to clean up the /tmp directory
function cleanTmpDirectory() {
  try {
    // Delete existing files in the /tmp directory
    fs.readdirSync('/tmp').forEach(file => {
      const filePath = path.join('/tmp', file);
      fs.unlinkSync(filePath);
      console.log("Deleted file:", filePath);
    });
  } catch (error) {
    console.error('Error cleaning /tmp directory:', error);
  }
}