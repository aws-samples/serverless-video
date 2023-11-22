/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

'use strict'

const AWS = require('aws-sdk')
AWS.config.update({ region: process.env.AWS_REGION })
const cognito = new AWS.CognitoIdentityServiceProvider()

const eventbridge = new AWS.EventBridge()

// Returns details of a Place ID where the app has user-generated content.
exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2))


  // Publish event to EventBridge
  const ebParams = {
    Entries: [
      {
        Detail: JSON.stringify(event),
        DetailType: 'BroadcastUserCreated',
        EventBusName: 'default',
        Source: 'serverlessVideo.Cognito',
        Time: new Date
      }
    ]
  }


  // add user to broadcast user group
  const userEmailDomain = event.request.userAttributes.email.split("@")[1];
  const allowedDomains = ['amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.es', 'amazon.it', 'amazon.co.jp', 'amazon.cn', 'amazon.com.br', 'amazon.com.mx', 'amazon.com.au', 'amazon.in', 'amazon.ae', 'amazon.sa'];

  if (allowedDomains.includes(userEmailDomain)) {

    console.log('publishEvent: ', ebParams)
    const response = await eventbridge.putEvents(ebParams).promise()
    console.log('EventBridge putEvents:', response)
  

    const params = {
      UserPoolId: event.userPoolId,
      Username: event.userName,
      GroupName: 'broadcasters'
    }
    const ug_response = await cognito.adminAddUserToGroup(params).promise()
    console.log('addUserToGroup: ', ug_response)
  }
  return event

}
