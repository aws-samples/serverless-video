import { handler } from '../../functions/list-leaders';
import { listLeaderboardByDurationEvent, listLeaderboardByStreamsEvent } from '../utils/listLeaderboardEvent';
import { contextJSON } from '../utils/context';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
//import { SignatureV4 } from '@aws-sdk/signature-v4';


describe('list-leaders', () => {
    const axiosMock = new MockAdapter(axios);
    //const sigv4Mock = mockClient(SignatureV4.prototype.sign);
    const leaderboardDuration = {
      "items": [
        {
          "__typename": "DurationEntry",
          "channelId":"08d143f0-00f1-7052-f97a-cbcda39ff077",
          "username":"random1",
          "rank": 1,
          "totalSeconds":24000
        }
      ],
      "nextToken": "bGVhZGVyYm9hcmQ6MTE"
    };

    const leaderboardStream = {
      "items": [
        {
          "__typename": "StreamsEntry",
          "channelId":"08d143f0-00f1-7052-f97a-cbcda39ff077",
          "username":"random1",
          "rank": 1,
          "count":1
        }
      ],
      "nextToken": "bGVhZGVyYm9hcmQ6MTE"
    };

    describe('Unit test listLeaders function', () => {
        it('verifies leaderboard by duration', async () => {
          // given
          axiosMock.onGet().reply(200, leaderboardDuration);
          //sigv4Mock.onAnyCommand().resolves({});

          // when
          const durationResult = await handler(listLeaderboardByDurationEvent, contextJSON);
    
          // then
          expect(axiosMock.history.get[0].url).toEqual(process.env.LEADERBOARD_SERVICE_ENDPOINT);
          expect(durationResult.items[0]).toEqual(leaderboardDuration.items[0]);
        });

        it('verifies leaderboard by stream', async () => {
          // given
          axiosMock.onGet().reply(200, leaderboardStream);
          //sigv4Mock.onAnyCommand().resolves({});

          // when
          const result = await handler(listLeaderboardByStreamsEvent, contextJSON);
    
          // then
          expect(axiosMock.history.get[0].url).toEqual(process.env.LEADERBOARD_SERVICE_ENDPOINT);
          expect(result.items[0]).toEqual(leaderboardStream.items[0]);
        });

      });

});