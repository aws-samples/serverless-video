import { handler } from '../../functions/post-metadata-hook';
import { postMetadataHookEvent } from '../utils/postMetadataHookEvent';
import { contextJSON } from '../utils/context';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { mockClient } from 'aws-sdk-client-mock';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
//import { SignatureV4 } from '@aws-sdk/signature-v4';


describe('post-metadata-hook', () => {
    const axiosMock = new MockAdapter(axios);
    const eventbridgeMock = mockClient(EventBridgeClient);
    //const sigv4Mock = mockClient(SignatureV4.prototype.sign);
    
    describe('Unit test postMetadata hook', () => {
        it('verifies postMetadata event processing', async () => {
          // given
          const leaderboard = {
            "channelId":"08d143f0-00f1-7052-f97a-cbcda39ff077",
            "author":"random1",
            "duration":24000
          };
          axiosMock.onPut().reply(200, leaderboard);
          eventbridgeMock.onAnyCommand().resolves({});
          //sigv4Mock.onAnyCommand().resolves({});

          // when
          const result = await handler(postMetadataHookEvent, contextJSON);
    
          // then
          expect(axiosMock.history.put[0].url).toEqual(process.env.LEADERBOARD_SERVICE_ENDPOINT);
          expect(result?.channelId).toEqual('08d143f0-00f1-7052-f97a-cbcda39ff077');
        });
      });

});