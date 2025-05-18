Club resource tracking bot for the game Super Snail.

# Slash commands

* `/set-essence [amount]` (or `/se [amount]`): Set essence count for yourself
* `/set-player-essence [player] [amount]`: Set essence count for a specific player
* `/show-essence`: Show essence count for yourself
* `/total-essence`: Show total essence for all club members
* `/overdue-essence`: Show players who are overdue updating their essence value
* `/set-gold [amount]` (or `/sg [amount]`): Set gold count for yourself
* `/set-player-gold [player] [amount]`: Set gold count for a specific player
* `/show-gold`: Show gold count for yourself
* `/total-gold`: Show total gold for all club members
* `/overdue-gold`: Show players who are overdue updating their gold value
* `/find [floor] [message]`: Send a message telling club members to dig to a specific floor (11-20)
* `/kill [floor] [message]`: Send a message telling club members to kill a specific floor boss (11-20)
* `/post-forgetful-message`: Posts the message for users to react to, to get automatically assigned the Forgetful role
* `/trigger-daily-checkin`: Manually trigger the daily check-in reminder message
* `/check-sheet-roles`: Check and update roles based on team assignments from the Google Sheet

# Getting started

1. Copy `.env.sample` to `.env` and replace the placeholders.
1. Run `npm i`

# Running the bot

1. Run `npm start`

# Update commands (run when definitions have changed)

1. Run `npm deploy`

# Invite URL

Use this URL to invite the bot to your server: `https://discord.com/oauth2/authorize?client_id=1322218979040690176&permissions=2048&integration_type=0&scope=bot+applications.commands`
