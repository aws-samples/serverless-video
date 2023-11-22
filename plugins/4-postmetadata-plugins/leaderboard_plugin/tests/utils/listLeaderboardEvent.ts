import { LeaderType } from '../../functions/common/constants';

interface ListLeadersPayload {
  by: LeaderType
  limit: number
  nextToken?: string
}

export const listLeaderboardByDurationEvent: ListLeadersPayload = {
    "by": "DURATION",
    "limit": 10,
    "nextToken": null
} as any

export const listLeaderboardByStreamsEvent: ListLeadersPayload = {
    "by": "STREAMS",
    "limit": 10,
    "nextToken": null
} as any
