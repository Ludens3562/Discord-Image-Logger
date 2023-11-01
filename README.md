# Discord Image logger
When detecting an image deletion event, download the image and repost it to the log channel.
This allows for persistent file logging.

①Clone the repository.  
②Create a .env file and enter `token=”YOUR BOT TOKEN”`  
③Describe the channels that will post logging data in "config.json" in the order of `”Serverid”:”channel ID”`  
④Run `node install` 
⑤Run `node ./src/index.js` to start the BOT  
⑥*Enjoy your logging!*