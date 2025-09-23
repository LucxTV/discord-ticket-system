Discord Ticket & Unban Appeal System
A powerful and feature-rich Discord bot designed to handle support tickets, staff applications, and unban appeals for Minecraft servers. This bot seamlessly integrates with your Minecraft server's database to provide detailed ban information and streamline the appeal process.

🎯 Features:
🎫 Ticket System
Category-based tickets: Technical problems, player reports, bug reports, and other inquiries

Custom embeds: Professional-looking ticket interfaces with custom emojis

Staff notifications: Automatic role mentions for quick response times

Ticket management: Close, reopen, and delete tickets with ease

📝 Staff Applications:
Position-specific applications: Moderator, Developer, Builder, and Media/Famous roles

Media applications: Special form for content creators with social media links

Customizable questions: Tailor application questions for each position

Secure channel creation: Private channels for each application

🔒 Unban Appeal System:
Database integration: Connects to your Minecraft server's punishment database

Ban verification: Automatically validates Ban IDs and retrieves ban details

Comprehensive ban history: Shows previous bans, duration, and punishment history

Staff decision tools: Accept or reject appeals with one click

🚀 Quick Start:
Prerequisites
Node.js 16.9.0 or higher

Discord bot token

MySQL database with punishment records

Discord server with appropriate permissions

Installation
Clone the repository

bash
git clone https://github.com/lucxtv/discord-ticket-system.git
cd ticket-system
Install dependencies

bash
npm install

Configure the bot in config.json:

{
"token": "YOUR_DISCORD_BOT_TOKEN",
"guildId": "YOUR_SERVER_ID",
"adminRoleId": "ADMIN_ROLE_ID",
"moderatorRoleId": "MODERATOR_ROLE_ID",
"mysql": {
"dbHost": "localhost",
"dbUser": "username",
"dbPassword": "password",
"dbName": "database"
}
}
Start the bot

bash
node bot.js
⚙️ Configuration:
Channel Setup Commands
!setup-tickets - Creates the ticket selection menu

!setup-apply - Sets up staff application categories

!setup-unban - Creates the unban appeal button

Database Integration
The bot connects to your Minecraft server's database to fetch:

Ban records and history

Player punishment information

Ban durations and reasons

Staff member who issued the ban

🎨 Customization:
Emoji System
Easily customize all emojis through the config file, u can use custom discord emojis:

json
{
"emojis": {
"ticket": "🎫",
"apply": "📝",
"unban": "🔒",
"technical": "<:technical:123456789>",
"moderator": "<:moderator:123456789>"
}
}
Embed Colors
Tickets: Purple (#8B5CF6)

Applications: Green (#10B981)

Unban Appeals: Red (#EF4444)

🔧 Technical Features:
Database Queries
Real-time ban information lookup

Punishment history tracking

Multiple database fallback support

Error handling for missing records

Permission System
Role-based access control

Channel-specific permissions

Staff-only commands

User-specific ticket access

Moderation Tools
One-click appeal decisions

Ban reason display

Punishment type identification

Historical ban context

📊 Ban Information Display:
When a user submits an unban appeal, the bot automatically displays:

Ban Details: ID, reason, duration, and type

Player History: Total ban count and previous offenses

Staff Information: Who issued the ban and when

Appeal Status: Real-time decision tracking

🛡️ Security Features:
Private channels: All tickets are hidden from non-staff members

User verification: Ensures only authorized users can access their tickets

Database protection: Secure MySQL connections with error handling

Permission checks: Prevents unauthorized command usage

🤝 Support:
For support, bug reports, or feature requests, please open an issue on GitHub or contact me on Discord.

📄 License:
This project is licensed under the MIT License - see the LICENSE file for details.
