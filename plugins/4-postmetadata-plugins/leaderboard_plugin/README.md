# serverlessVideo Leaderboard Plugin

The leaderboard plugin uses post metadata events to build two leaderboard: (1) stream counts and (2) total stream duration (seconds). The leaderboard is exposed as a GraphQL API.

## Architecture

> TODO: Insert a diagram here!

## Sample GraphQL queries

To retrieve the leaderboard for most streams:

```graphql
query MyQuery {
  listLeaders(by: STREAMS) {
    items {
      channel
      username
      rank
      ... on DurationEntry {
        totalSeconds
      }
      ... on StreamsEntry {
        count
      }
    }
  }
}
```

To query for the total duration leaderboard, use `DURATION`.

## To Do

- Cleanup `TODO` tags in code
- Improve `nextToken` logic in `listLeaders` query
- Use another identifier for channel name
- Add subscriptions to leaderboard API
