# serverlessVideo Plugin Tester with AWS SAM

The serverlessVideo Plugin Tester is a tool for testing and validating plugin compatibility in the serverlessVideo application. You can easily deploy and use it with AWS SAM (Serverless Application Model) for efficient testing of your serverlessVideo plugins.

## Table of Contents

- [Prerequisites](#prerequisites)

- [Installation](#installation)

- [Deployment](#deploy)

- [Run](#run)

- [Success](#success)

- [Fail](#fail)

- [Editing](#editing)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **AWS SAM CLI**: Make sure you have AWS SAM CLI installed. Install it by following the instructions at [https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html).

## Deploy

To deploy the serverlessVideo Plugin Tester, follow these steps:

1. Clone this repository to your local machine:

 ```bash

git clone https://github.com/aws-samples/serverless-video-streaming.git

1. Change to the project’s directory:

 ```bash

 cd serverless-video-streaming/plugins/plugin_tester

 ```

1. Deploy using AWS SAM

 ```bach

 sam build && sam deploy -g

 ```

## Run

To run the plugin tester:

1. Navigate to the `PluginLifecycleWorkflow` workflow in the AWS Step Functions console.

1. Choose Start execution, and again choose Start execution. Enter your `eventHook` and `pluginTitle` as parameters as input.

For example:

```

{
 "eventHook": "preValidate",
 "pluginTitle": "TestPlugin"
}

```

### Fail:

The workflow will return an error if:

1. You have configured your plugin or the tester with an invalid event hook

![Fail](/images/plugin_tester_3.png).

1. Your plugin response takes longer than the max wait time, or if your plugin response does not emit an event with the correct task token:

![Fail](/images/plugin_tester_2.png).

1. Your plugin completes but returns an invalid response:

![Fail](/images/plugin_tester_4.png).

### Success:

If your plugin successfully returns a valid response, the workflow will complete successfully:

![Success](/images/plugin_tester_1.png).

Congratulations, you’re ready to make a PR to the repo.

## Troubleshooting

If the plugin tester is not working as expected, make sure that your input parameters match your `eventHook` and `pluginTitle` properties:

![edit](/images/plugin_tester_5.png).