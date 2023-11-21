const { S3Client, PutObjectCommand,GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const ffmpegPath = '/opt/bin/ffmpeg'; // Corrected path
const spawn = require('child_process').exec;

const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const s3Client = new S3Client(); // Replace 'your-region' with the actual region


exports.handler = async (event) => {




//// take in an array of MP4 locations

// save each one to tmp

// use ffmpeg to create a master mp4

//save mp4 back to s4


 
  const inputPlaylistKey = event.mapRes[0].mp4.replace("prepocessing/", "").replace("/output-0.mp4", "");
  const inputBucket = process.env.SourceBucket;
  const outputBucket =process.env.DestinationBucket
  const promises = event.mapRes.map(async mp4File => {
    const mp4Path = mp4File.mp4;
    const iteration = mp4File.iteration;
    const tmpFilePath = await downloadAndStoreFile(outputBucket, mp4Path,iteration);
    console.log("mp4 file saved to tmp:", mp4Path);
    return  tmpFilePath;
  });


  const thumbnailPath = `${event.detail.recording_s3_key_prefix}/media/thumbnails/thumb0.jpg`;
    // first we download and store the thumbnail File
  const downloadedThumbPath = await downloadAndStoreFile(inputBucket, thumbnailPath);

  const tmp4array = await Promise.all(promises);
  const outputFileName = `master.mp4`;
  const outputFilePath = path.join('/tmp', outputFileName);
  
  console.log('tmp4array',tmp4array)



  console.log('Starting conversion...');

  //const filterComplex = tmp4array.map((file, index) => `[${index}:v] [${index}:a]`).join(' ');
  //const ffmpegCommand = `ffmpeg ${tmp4array.map(file => `-i ${file}`).join(' ')} -filter_complex "${filterComplex} concat=n=${tmp4array.length}:v=1:a=1 [v] [a]" -map "[v]" -map "[a]" -c:v copy -c:a copy ${outputFilePath}`;
    
  
    const segmentListFilePath = '/tmp/segmentlist.txt';
    fs.writeFileSync(segmentListFilePath, tmp4array.map(segment => `file ${segment}\n`).join(''));    
    const ffmpegCommand = `ffmpeg -f concat -safe 0 -i ${segmentListFilePath} -f mp4 -movflags frag_keyframe+empty_moov -bsf:a aac_adtstoasc -c copy - ${outputFilePath}`;




  console.log('ffmpegCommand',ffmpegCommand)

  try {
    await new Promise((resolve, reject) => {
        ffmpegProcess.stdout.on('data', (data) => {
            console.log(`FFmpeg STDOUT: ${data}`);
          });

          ffmpegProcess.stderr.on('data', (data) => {
            console.error(`FFmpeg STDERR: ${data}`);
          });

          ffmpegProcess.on('close', (code) => {
            if (code === 0) {
              console.log('Concatenation completed');
              // Rest of your code for uploading and returning the result
            } else {
              console.error('FFmpeg process exited with code:', code);
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
          Key: `${inputPlaylistKey}/${outputFileName}`,
          Body: fileContent
      };
      // Upload the file to S3
      const command = new PutObjectCommand(params);
      await s3Client.send(command);
      console.log('uploaded to S3')
    } catch (error) {
        console.error('Error:', error);
    }

    try {
      // Read the source file
      const fileContent = fs.readFileSync('/tmp/thumb0.jpg');
      // Prepare the S3 upload parameters
      const params = {
          Bucket: outputBucket,
          Key: `media/${inputPlaylistKey}thumbnails/thumb0.jpg`,
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
      body:{ 
        playbackUrl: `https://dmpdx8pmqxo3f.cloudfront.net/${inputPlaylistKey}/${outputFileName}`,
        thumbnailUrl:`https://dmpdx8pmqxo3f.cloudfront.net/${inputPlaylistKey}/thumbnails/thumb0.jpg`,
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
async function downloadAndStoreFile(bucketName,fileKey,iteration) {

  let name=''
  if (!iteration){
     name = 'thumb0.jpg'
  }else{
     name = iteration+'.mp4'
  }
  const downloadPath = path.join("/tmp", path.basename(name));

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
