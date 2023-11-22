import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
import { v4 as uuidv4 } from 'uuid';
import { setTimeout } from 'timers/promises';

const sfn_client = new SFNClient();
const stack = process.env.STACK_NAME;
let plugin_state_machine_arn: string | undefined = 'arn:aws:states:us-east-1:123456789012:stateMachine:PluginLifecycleWorkflow';

describe('Run tests for postMetadata pathway in plugin tester', () => {
    it('verifies successful leaderboard plugin execution', async () => {
        const cfm_client = new CloudFormationClient();
        const cfm_input = { StackName: process.env.STACK_NAME };
        const cfm_command = new DescribeStacksCommand(cfm_input);
        const cfm_response = await cfm_client.send(cfm_command);
        const stacks = cfm_response["Stacks"];
        if (stacks !== undefined) {
            const stack_outputs = stacks[0].Outputs;
            if (stack_outputs !== undefined) {
                plugin_state_machine_arn = stack_outputs[0].OutputValue;
            }
        }
        //const plugin_state_machine_arn = cfm_response["Stacks"][0]["Outputs"][0]["OutputValue"];
        const execution_name = "Test-PostMetadata-" + uuidv4();

        let input = {
            "eventHook": "postMetadata",
            "pluginTitle": "leaderboardPlugin"
        };

        let sfn_input = { 
            stateMachineArn: plugin_state_machine_arn, 
            name: execution_name, 
            input: JSON.stringify(input)
        };

        // start the execution
        let sfn_exec_command = new StartExecutionCommand(sfn_input);
        let response = await sfn_client.send(sfn_exec_command);
        let executionArn = response["executionArn"];

        // loop until it is finished or until 30 seconds have passed
        let x = 1
        do {
            x++;
            let sfn_arn = { 
                executionArn
            };
            let sfn_desc_command = new DescribeExecutionCommand(sfn_arn);
            var sfn_exec_details = await sfn_client.send(sfn_desc_command);
            console.log("Status: " + sfn_exec_details.status);
            await setTimeout(2000);
            if (x >= 15) break;
        } while (sfn_exec_details.status == "RUNNING");

        expect(sfn_exec_details.status).toEqual("SUCCEEDED");

    }, 30000);

});