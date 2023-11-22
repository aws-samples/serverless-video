export const loadEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }

  return value;
};

export const encodeChannelId = (channelId: string, username: string): string =>
  `${channelId}++${username}`;

export const decodeChannelId = (channelId: string): { channelId: string; username?: string } => {
  const [ channel, username ] = channelId.split('++');

  return {
    channelId: channel,
    username
  };
};
