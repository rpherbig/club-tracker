# Discord API Wrappers

## Overview

This document outlines the Discord.js API limitations we've encountered and the wrapper functions we've created to address them.

## Known Discord.js Limitations

### 1. Interaction Reply Complexity

**Problem**: Discord.js interactions have complex state management that requires careful handling:
- Interactions can be in different states: `replied`, `deferred`, or neither
- Each state requires different API calls (`reply`, `editReply`, `followUp`)
- Interactions have a 3-second timeout that can cause errors
- Ephemeral messages require special flags

**Solution**: `sendEphemeralReply()` wrapper in `utils/discord-helpers.js`

```javascript
// Instead of complex state checking everywhere:
if (interaction.deferred) {
    await interaction.editReply(content);
} else if (interaction.replied) {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
} else {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

// Use the wrapper:
await sendEphemeralReply(interaction, content);
```

### 2. Channel Message Length Limits

**Problem**: Discord has a 2000-character limit per message, but the Discord.js `channel.send()` doesn't handle this automatically.

**Solution**: `sendChannelMessage()` wrapper in `utils/discord-helpers.js`

```javascript
// Instead of manually splitting messages:
if (content.length > 2000) {
    // Complex splitting logic...
}

// Use the wrapper:
await sendChannelMessage(channel, content); // Automatically handles splitting
```
