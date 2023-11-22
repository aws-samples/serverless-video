export interface serverlessVideoDetail {
  video: serverlessVideoVideo
  pluginData: serverlessVideoPluginData
  taskToken: string
}

export interface serverlessVideoVideo {
  createdAt: string
  durationmillis: number
  thumbnail: string
  playbackUrl: string
  channel: string
  id: string
  author: {
    username: string
  }
}

export interface serverlessVideoPluginData {
  preValidate: serverlessVideoPluginOutput[]
  postValidate: [] // TODO: Fix postValidate payload
  preMetadata: serverlessVideoPluginOutput[]
}

export interface serverlessVideoPluginOutput {
  OutputKey: string
  OutputValue: {
    [header: string]: boolean | number | string | undefined
  }
}

export interface Leaderboard {
  items: [ LeaderboardEntry ] | []
  nextToken: string | undefined
}

export interface LeaderboardEntry {
  __typename?: string
  channel: string
  username?: string
  rank: number
  totalSeconds?: number
  count?: number
}
