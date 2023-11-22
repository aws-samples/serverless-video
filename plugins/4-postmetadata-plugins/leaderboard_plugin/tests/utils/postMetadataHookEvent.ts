import { EventBridgeEvent  } from 'aws-lambda';
import { serverlessVideoDetail } from '../../functions/common/serverlessVideo';

export const postMetadataHookEvent: EventBridgeEvent<'serverlessVideoDetail', serverlessVideoDetail> = {
    "version": "0",
    "id": "84036a02-7475-25ed-1d57-e7426e3dc553",
    "detail-type": "postMetadata.leaderboardPlugin",
    "source": "serverlessVideo.pluginManager",
    "account": "832196373597",
    "time": "2023-08-31T09:54:38Z",
    "region": "us-west-2",
    "resources": [
      "arn:aws:states:us-west-2:832196373597:stateMachine:832196373597-us-west-2-PluginLifecycleWorkflow",
      "arn:aws:states:us-west-2:832196373597:execution:832196373597-us-west-2-PluginLifecycleWorkflow:59c3b33d-7248-43b3-81e3-5c6205c2a955"
    ],
    "detail": {
      "video": {
        "createdAt": "2023-08-30T14:57:51.169Z",
        "durationmillis": 24000,
        "thumbnail": "https://dmpdx8pmqxo3f.cloudfront.net/media/ivs/v1/832196373597/ERaAhUZnrHJG/2023/8/30/14/57/ovoTjGdG38Mk/media/hls/720p30/thumbnails/thumb0.jpg",
        "playbackUrl": "https://dmpdx8pmqxo3f.cloudfront.net/media/ivs/v1/832196373597/ERaAhUZnrHJG/2023/8/30/14/57/ovoTjGdG38Mk/media/hls/720p30/output.mp4",
        "channel": "08d143f0-00f1-7052-f97a-cbcda39ff077",
        "id": "st-1E4rsUkhLinpvScDxzDQ7ql",
        "author": {
          "username": "random1"
        }
      },
      "pluginData": {
        "preValidate": [
            {
              "OutputKey": "plugin-duration_plugin",
              "OutputValue": {
                "valid": true
              }
            }
          ],
          "postValidate": [
            //nothing currently registered for this hook
          ],
          "preMetadata": [
            {
              "OutputKey": "plugin-transcribeplugin",
              "OutputValue": {
                "transcript": "Go live video. Hello, broadcasting the app. Go right. Um, hm."
              }
            }
          ]
        },
      "taskToken": "1234567890"
    }
  } as any
