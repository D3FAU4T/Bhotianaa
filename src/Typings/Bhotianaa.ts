export interface commandsData {
    [channelName: string]: {
      commands: {
        [commandName: string]: {
          value: string,
          useParser: boolean;
        }
      },
      messages: {
        [messageName: string]: {
          value: string,
          useParser: boolean;
        }
      },
      Includes: {
        [messageName: string]: string;
      }
    }
  }