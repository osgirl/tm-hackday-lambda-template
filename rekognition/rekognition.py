import boto3
import json

def build_response(message, status_code):  
    return {
        'statusCode': str(status_code),
        'body': json.dumps(message),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
            },
        }

def detect_labels(bucket, key, max_labels=10, min_confidence=90, region="eu-west-1"):
	rekognition = boto3.client("rekognition", region)
	response = rekognition.detect_labels(
		Image={
			"S3Object": {
				"Bucket": bucket,
				"Name": key,
			}
		},
		MaxLabels=max_labels,
		MinConfidence=min_confidence,
	)
	return response['Labels']

def lambda_handler(event, context):
    
    bucket = event['bucket']
    key = event['key']

    response = dict()

    try:
        # Calls rekognition DetectLabels API to detect labels in S3 object
        response = detect_labels(bucket, key)


        # Print response to console.
        print(response)

        return build_response(response, 200)
    except Exception as e:
        print(e)
        print("Error processing object {} from bucket {}. ".format(key, bucket) +
              "Make sure your object and bucket exist and your bucket is in the same region as this function.")
        raise e
