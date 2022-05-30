# DiscordActivityMarkdownBot
Discord Bot that stores presence information for all users. The data is stored for the following purposes:
- Generate a status image SVG that lets you call a GET endpoint with a user id to get the users current status. 
Example of status image: [!My Discord](https://api.jommer.chat/discordStatus/getDiscordStatus/304475016936816640)
- When a user stops an activity the timestamps are stored. This provides a history of activity sessions that is used to view the time users spend on different activities. 
