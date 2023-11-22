import { Context } from 'aws-lambda';

export const contextJSON:Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'mocked',
    functionVersion: 'mocked',
    invokedFunctionArn: 'mocked',
    memoryLimitInMB: 'mocked',
    awsRequestId: 'mocked',
    logGroupName: 'mocked',
    logStreamName: 'mocked',
    getRemainingTimeInMillis(): number {
        return 999;
    },
    done(error?: Error, result?: any): void {
        return;
    },
    fail(error: Error | string): void {
        return;
    },
    succeed(messageOrObject: any): void {
        return;
    }
} as any
