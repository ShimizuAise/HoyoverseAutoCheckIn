const getTokens = () => {
  const tokensMap = {
    ltuid: "",
    ltuid_v2: "",
    ltoken: "",
    ltoken_v2: "",
    account_id: "",
    account_id_v2: "",
    account_mid: "",
    account_mid_v2: "",
  };

  const tokenKeys = Object.keys(tokensMap);
  const tokens = [];
  tokenKeys.forEach(key => {
    if (tokensMap[key]?.length > 0) {
      tokens.push(`${key}=${tokensMap[key]};`);
    }
  });
  const tokenString = tokens.join(" ");
  return tokenString;
};

// User profiles
const profiles = [{
    token: getTokens(),
    genshin: true,
    honkai_star_rail: true,
    honkai_3: true,
    zenless: true, // ZZZ Update
    accountName: "YOUR NAME HERE"
}];

// Notification configuration, Turn the notify to 'true' or 'false' depends what your needs
const notificationConfig = {
    discord: {
        notify: true,
        webhook: ""
    }
};

/** The above is the config. **/

/** The below code is the script code. DO NOT modify. **/

const log = (message) => {
    Logger.log(message);
};

// URLs for different games
const urls = {
    zenless: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign?lang=en-us&act_id=e202406031448091',  // ZZZ Update
    genshin: 'https://sg-hk4e-api.hoyolab.com/event/sol/sign?lang=en-us&act_id=e202102251931481',
    starRail: 'https://sg-public-api.hoyolab.com/event/luna/os/sign?lang=en-us&act_id=e202303301540311',
    honkai3: 'https://sg-public-api.hoyolab.com/event/mani/sign?lang=en-us&act_id=e202110291205111',
};

const buildHeaders = (game, token) => {
    const headers = {
      Cookie: token,
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      Connection: "keep-alive",
      "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Referer: "https://act.hoyolab.com/",
      Origin: "https://act.hoyolab.com"
    };
    if (game.game === "Zenless Zone Zero") headers["x-rpc-signgame"] = "zzz";
    return headers;
}

// Function to handle HTTP requests
const fetchUrls = async (gameMaps, token) => {
    log(`Starting HTTP requests`);
    try {
        const responses = await Promise.all(
            gameMaps.map(
                game => UrlFetchApp.fetch(
                    game.url, { method: 'POST', headers: buildHeaders(game, token), muteHttpExceptions: true }
                )
            )
        );
        log(`HTTP requests completed`);
        return responses.map(response => {
            const content = response.getContentText();
            try {
                return JSON.parse(content).message;
            } catch (error) {
                log(`Error parsing response: ${error}`);
                return "Error parsing response";
            }
        });
    } catch (error) {
        log(`Error occurred during HTTP requests: ${error}`);
        return Array(urls.length).fill("Error occurred during HTTP request");
    }
};

// Function to notify Discord
const notify = async (message) => {
    if (notificationConfig.discord.notify && notificationConfig.discord.webhook) {
        const discordPayload = JSON.stringify({ 'username': 'Hoyolab-AutoCheck-In', 'avatar_url': 'https://i.imgur.com/LI1D4hP.png', 'content': message });
        const discordOptions = { method: 'POST', contentType: 'application/json', payload: discordPayload, muteHttpExceptions: true };

        try {
            await UrlFetchApp.fetch(notificationConfig.discord.webhook, discordOptions);
            log(`Discord notification sent`);
        } catch (error) {
            log(`Error sending message to Discord: ${error}`);
        }
    } else {
        log(`Discord notification not sent: Configuration missing or disabled`);
    }
};

// Main function
const main = async () => {
    const startTime = new Date().getTime();
    log(`Starting main function`);

    const results = [];
    for (const profile of profiles) {
        log(`Processing profile: ${profile.accountName}`);
        const gameMap = [];

        if (profile.genshin) gameMap.push({game: "Genshin Impact", url: urls.genshin});
        if (profile.honkai_star_rail) gameMap.push({game: "Honkai Star Rail", url: urls.starRail});
        if (profile.honkai_3) gameMap.push({game: "Honkai Impact 3", url: urls.honkai3});
        if (profile.zenless) gameMap.push({game: "Zenless Zone Zero", url: urls.zenless});

        const responses = await fetchUrls(gameMap, profile.token);
        
        // Check each response and customize the message accordingly
        const profileResult = gameMap.map((game, index) => {
            if (responses[index] === "OK") {
                return `${game.game}: Check-in Success!`;
            } else if (responses[index].includes("already checked in today")  || responses[index].includes("already signed in")) {
                return `${game.game}: Already Checked in today!`;
            } else if (responses[index].includes("Not logged in") || responses[index].includes("Please log in to take part in the event")) {
                return `${game.game}: There's some issue with your provided account settings!`;
            } else {
                return `${game.game}: Unknown response: ${responses[index]}`;
            }
        }).join("\n");
        
        results.push(`Check-in completed for : ${profile.accountName}\n${profileResult}`);
    }

    const message = results.join('\n\n');
    await notify(message);

    const endTime = new Date().getTime();
    const executionTime = (endTime - startTime) / 1000; // Convert milliseconds to seconds
    log(`Finished main function. Execution time: ${executionTime} seconds`);
};
