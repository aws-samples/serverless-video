
// handle message
const processMessage = (msg) => {
  const body = JSON.parse(msg.body);

  // detail.pluginData.preMetadata
  const preMetadata = body.detail.pluginData.preMetadata;

  const transcriptInfo = preMetadata.find(o => o.OutputKey === 'plugin-transcribeplugin');
  let result = {
    taskToken: body.detail.taskToken
  };
  if (transcriptInfo) {
    const transcriptUri = transcriptInfo.OutputValue.TranscriptFilePointers.TranscriptFileUri.replace('https://s3.us-west-2.amazonaws.com/', '/');
    // convert from web style S3 to what S3 wants for copy object
    // https://s3.us-west-2.amazonaws.com/serverlessVideo-basecore-cdnstack-p6b-originbucket-qf6cyql0kb4m/ivs/v1/093675026797/nIET8AxYI7Nq/2023/10/5/13/51/8HHcMJ1FCBR3/transcribe.json
    result['transcriptUri'] = transcriptUri;
    result['tempBucket'] = process.env.TEMP_STORAGE_BUCKET;

    const parts = transcriptUri.split('/');
    result['desinationBucket'] = parts[1];
    result['desinationKey'] = parts.slice(2, parts.length - 1).join('/');
  }

  return result;
}

// handler
export const handler = async(event) => {
  // console.log(JSON.stringify(event));

  const result = [];
  for (const record of event) {
    result.push(processMessage(record));
  }

  console.log(JSON.stringify(result));

  return result;
};
