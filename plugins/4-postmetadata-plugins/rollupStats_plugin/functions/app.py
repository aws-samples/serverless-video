from os import environ
import json
import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools import Tracer
from aws_lambda_powertools import Metrics
from aws_lambda_powertools.metrics import MetricUnit

tracer = Tracer()
logger = Logger(level=environ.get('LOG_LEVEL'))
metrics = Metrics(namespace="rollup_stats_plugin")

ddb_table_name = environ.get('ROLLUP_TABLE')

dynamodb = boto3.resource('dynamodb')
ddb_table = dynamodb.Table(ddb_table_name)
eb = boto3.client('events')
# If we need to make these scale better, eventually move them to an array of keys, use a scatter gather pattern
video_count_key = "video_count_key"
hours_of_video_key = "hours_of_video_key"

# If this is the very first time we're running, we'll add these keys
response = ddb_table.get_item(Key={'hkey': video_count_key, 'skey': video_count_key})
if not ('Item' in response):
    logger.debug("Adding video_count key")
    ddb_table.put_item(Item={'hkey': video_count_key, 'skey': video_count_key, 'video_count': 0})

response = ddb_table.get_item(Key={'hkey': hours_of_video_key, 'skey': hours_of_video_key})
if not ('Item' in response):
    logger.debug("Adding hours_of_video key")
    ddb_table.put_item(Item={'hkey': hours_of_video_key, 'skey': hours_of_video_key, 'ms_of_video': 0})

@tracer.capture_method
def idempotency_check(hkey, skey):
    ### check if the record exists
    response = ddb_table.get_item(
        Key={
            "hkey": hkey,
            "skey": skey
        }
    )
    #logger.debug(response)
    return ('Item' in response)

@tracer.capture_method
def add_metadata(hkey, skey, metadata):
    ### add metadata to the table
    response = ddb_table.put_item(
        Item={
            "hkey": hkey,
            "skey": skey,
            "metadata": metadata
        }
    )
    logger.debug(response)
    return response

@tracer.capture_method
def update_video_count():
    ### update the count of videos in the table
    response = ddb_table.update_item(
        Key={
            "hkey": video_count_key,
            "skey": video_count_key
        },
        UpdateExpression="SET #vkey = #vkey + :val",
        ExpressionAttributeNames={
            "#vkey": "video_count"
            },
            ExpressionAttributeValues={
                ":val": 1
                },
                ReturnValues="UPDATED_NEW"
                )
    logger.debug(response)
    return response['Attributes']['video_count']

def update_hours_of_video(ms_of_video):
    ### update the hours_of_video key by the milliseconds of the video
    response = ddb_table.update_item(
        Key={
            "hkey": hours_of_video_key,
            "skey": hours_of_video_key
        },
        UpdateExpression="SET #key = #key + :val",
        ExpressionAttributeNames={
            "#key": "ms_of_video"
            },
            ExpressionAttributeValues={
                ":val": ms_of_video
                },
                ReturnValues="UPDATED_NEW"
                )
    logger.debug(response)
    return float(response['Attributes']['ms_of_video'])

@tracer.capture_method
def emit_event(event, current_video_count, hours_of_video):
    task_token = event["detail"]["taskToken"]
    event = {
        "Detail": json.dumps({
            "Message": {
                "pluginData": {
                    "total_video_count": int(current_video_count),
                    "total_hours_of_video": hours_of_video
                }
            },
            "TaskToken": task_token
        }),
        "DetailType": "plugin-complete",
        "Source": "serverlessVideo.plugin.rollupStats",
        "EventBusName": "default"
    }
    response = eb.put_events(Entries=[event])
    logger.debug(response)

@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event, context):
    logger.debug(event)
    # do idempotency check
    vid_id = event['detail']['video']['id']
    logger.info(f"video id: {vid_id}")
    if idempotency_check(vid_id, vid_id):
        logger.info("idempotency check failed, returning existing stats")
        response = ddb_table.get_item(Key={'hkey': video_count_key, 'skey': video_count_key})
        current_video_count = int(response['Item']['video_count'])
        response = ddb_table.get_item(Key={'hkey': hours_of_video_key, 'skey': hours_of_video_key})
        current_ms_of_video = float(response['Item']['ms_of_video'])
        hours_of_video = current_ms_of_video / 1000 / 60 / 60
    else:
        # update the stats
        # add metadata to dynamodb
        response = add_metadata(vid_id, vid_id, event)

        # update video count
        current_video_count = update_video_count()

        # update hours of video 
        ms_video = event['detail']['video']['durationmillis'] 
        total_ms_video = update_hours_of_video(ms_video)
        hours_of_video = total_ms_video / 1000 / 60 / 60

    # send event to eventbridge
    metrics.add_metric(name="video_count", unit=MetricUnit.Count, value=current_video_count) 
    metrics.add_metric(name="hours_of_video", unit=MetricUnit.Count, value=hours_of_video)
    response = emit_event(event, current_video_count, hours_of_video) 
    logger.info(f"video_count: {current_video_count}")
    logger.info(f"hours_of_video: {hours_of_video}")
    
    return {
      "total_video_count": current_video_count,
      "total_hours_of_video": hours_of_video
    }