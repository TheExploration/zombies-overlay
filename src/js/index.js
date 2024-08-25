/*
    Copyright (C) 2021  zani

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const fs = require("fs")
const os = require("os")
const path = require("path")
const api = require("./js/api")
const LogReader = require("./js/LogReader")
const { shell } = require("electron")
//FIX?
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const colors = {
    "DARK_RED": "#AA0000",
    "RED": "#FF5555",
    "GOLD": "#FFAA00",
    "YELLOW": "#FFFF55",
    "DARK_GREEN": "#00AA00",
    "GREEN": "#55FF55",
    "AQUA": "#55FFFF",
    "DARK_AQUA": "#00AAAA",
    "DARK_BLUE": "#0000AA",
    "BLUE": "#5555FF",
    "LIGHT_PURPLE": "#FF55FF",
    "DARK_PURPLE": "#AA00AA",
    "WHITE": "#FFFFFF",
    "GRAY": "#AAAAAA",
    "DARK_GRAY": "#555555",
    "BLACK": "#000000"
}

const ranks = {
    "SUPERSTAR": `<span style="color: {monthly_color}">[MVP</span>{plus_color}{plus_color}<span style="color: {monthly_color}">] `,
    "MVP_PLUS": `<span style="color: ${colors["AQUA"]}">[MVP</span>{plus_color}<span style="color: ${colors["AQUA"]}">] `,
    "MVP": `<span style="color: ${colors["AQUA"]}">[MVP] `,
    "VIP_PLUS": `<span style="color: ${colors["GREEN"]}">[VIP</span><span style="color: ${colors["GOLD"]}">+</span><span style="color: ${colors["GREEN"]}">] `,
    "VIP": `<span style="color: ${colors["GREEN"]}">[VIP] `,
    "NON": `<span style="color: ${colors["GRAY"]}">`
}

const threatColors = [
    "GREEN",
    "YELLOW",
    "RED",
    "DARK_PURPLE"
]

const threatNames = [
    "BAD",
    "OK",
    "GOOD",
    "VERY GOOD"
]

window.addEventListener("load", () => {
    const userList = document.querySelector("#users")

    userList.style.visibility = "visible"

    const folderPath = path.join(os.homedir(), "/duels_overlay")
    const configPath = path.join(folderPath, "config.json")
    const mcApi = new api.McAPI()

    let lastLog = []
    let changedLogs = []
    let logs = []
    let users = []

    let config = {
        user: "",
        apiKey: "",
        apiMode: "",
        minecraftPath: require("minecraft-folder-path")
    }

    let hypixelApi
    let logPath = ""

    if (fs.existsSync(folderPath)) {
        config = JSON.parse(fs.readFileSync(configPath, { encoding: "utf8" }))

        console.log(config)

        if (config.apiMode === "custom") {
            apiKey = config.apiKey;
        } else {
            apiKey = "Hypixel-API-KEY";
        }
        
        hypixelApi = new api.HypixelAPI(apiKey)
        logPath = path.join(config.minecraftPath, "latest.log")

        const logReader = new LogReader(logPath)

        logReader.on("server_change", () => {
            users = []
            for (const element of document.querySelectorAll(".user")) {
                element.remove()
            }
        })

        logReader.on("join", (name) => {
            console.log(name)
            mcApi.getUuid(name).then(uuid => {
                hypixelApi.getPlayer(uuid).then(async (res) => {
                    
                    // ====== check if API-KEY is valid ====== //
                    if (res.error === 'API_KEY_EXPIRED') {
                        const userElement = document.createElement("tr")
                        const errorElement = document.createElement("td")
                        errorElement.innerHTML = `<span style="color: ${colors["RED"]};">API Key Expired. Please update your API key in the settings.)</span>`
                        userElement.append(errorElement);
                        userList.append(userElement)

                        users.push(name)
                        return;
                    }
                    
                    
                    const player = res.player
                    console.log(player)

                    // ====== Detect the map the player is currently playing ====== //
                    const status = await hypixelApi.getStatus(uuid);
                    const map = status?.map;
                    console.log(map);

                    // ====== player-info elements ====== //
                    const guild = await hypixelApi.getGuild(uuid)
                    const userElement = document.createElement("tr")
                    const nameElement = document.createElement("td")
                    
                    // ====== win-stats elements ====== //
                    const totalWinsElement = document.createElement("td")
                    const winsDeadendElement = document.createElement("td")
                    const winsBadbloodElement = document.createElement("td")
                    const winsPrisonElement = document.createElement("td")
                    const bestAlienarcadiumRoundElement = document.createElement("td")
                    
                    // ====== general-stats elements ====== //
                    const kdrElement = document.createElement("td")
                    const killsElement = document.createElement("td")
                    const personalBestElement = document.createElement("td")
                    const threatElement = document.createElement("td")

                    console.log(guild)

                    if (player && player.stats["Arcade"]) {
                        const wins = player.stats["Arcade"]["wins_zombies"] || 0
                        const best_aa = player.stats["Arcade"]["best_round_zombies_alienarcadium"] || 0
                        const wins_bb = player.stats["Arcade"]["wins_zombies_badblood"] || 0
                        const wins_de = player.stats["Arcade"]["wins_zombies_deadend"] || 0
                        const kills = player.stats["Arcade"]["zombie_kills_zombies"] || 0
                        const deaths = player.stats["Arcade"]["deaths_zombies"] || 0
		                const kdr = Math.round((kills / deaths) * 100) / 100 || kills
		                const wins_pr = player.stats["Arcade"]["wins_zombies_prison"] || 0
                        
                        // ====== PB on current map ====== //
                        // can also be used to add map specific stats in the future
                        let fastestTime = "N/A";
                        switch(map) {
                            case "Dead End":
                                // fastest_time_30_zombies only returns the newest PB and not necessarily the fastest.
                                // As a result, if you get a new PB on hard that is slower than the one on normal, it would return the one from hard.
                                // To fix this, I get the PB from all difficulties and select the fastest of those.

                                const timesDeadend = [
                                    player.stats["Arcade"]["fastest_time_30_zombies_deadend_normal"],
                                    player.stats["Arcade"]["fastest_time_30_zombies_deadend_hard"],
                                    player.stats["Arcade"]["fastest_time_30_zombies_deadend_rip"]
                                ];
                                
                                const validTimesDeadend = timesDeadend
                                .map(time => !isNaN(time) ? Math.round(time / 60) : "N/A")
                                .filter(time => time !== "N/A");
                                
                                fastestTime = validTimesDeadend.length > 0 ? `${Math.min(...validTimesDeadend)} min` : "N/A";
                              break;
                            case "Bad Blood":
                                const timesBadblood = [
                                    player.stats["Arcade"]["fastest_time_30_zombies_badblood_normal"],
                                    player.stats["Arcade"]["fastest_time_30_zombies_badblood_hard"],
                                    player.stats["Arcade"]["fastest_time_30_zombies_badblood_rip"]
                                ];
                                
                                const validTimesBadblood = timesBadblood
                                .map(time => !isNaN(time) ? Math.round(time / 60) : "N/A")
                                .filter(time => time !== "N/A");
                                
                                fastestTime = validTimesBadblood.length > 0 ? `${Math.min(...validTimesBadblood)} min` : "N/A";
                              break;
                            case "Alien Arcadium":
                                fastestTime = fastestTime = best_aa ? `R${best_aa}` : "N/A";
                              break;
                            case "Prison":
                                const timesPrisonSurvive= [
                                    player.stats["Arcade"]["fastest_time_30_zombies_prison_normal"],
                                    player.stats["Arcade"]["fastest_time_30_zombies_prison_hard"],
                                    player.stats["Arcade"]["fastest_time_30_zombies_prison"]
                                ];
                                
                                const validTimesprison = timesPrisonSurvive
                                .map(time => !isNaN(time) ? Math.round(time / 60) : "N/A")
                                .filter(time => time !== "N/A");
                                
                                fastestTime = validTimesprison.length > 0 ? `${Math.min(...validTimesprison)} min` : "N/A";
                                // I was planning on also showing the fastest escape time however I couldn't find it in the API. I think its simply not in the API unless im blind
                              break;
                            default:
                                fastestTime = "Unknown map: " + map
                          }

                        let threatLevel = 0
                        let winsThreat = 0
                        let best_aaThreat = 0
                        let wins_bbThreat = 0
                        let wins_deThreat = 0
                        let wins_prThreat = 0
                        

                        console.log(player.stats["Duels"])
                        
                        if (wins >= 100) {
                            threatLevel += 3
                            winsThreat = 3
                        } else if (wins >= 30) {    
                            threatLevel+= 2        
                            winsThreat = 2
                        } else if (wins >= 2) {
                            threatLevel++
                            winsThreat = 1
                        }

                        if (best_aa >= 100) {
			                
                            best_aaThreat = 3
                        } else if (best_aa >= 70) {
                            
                            best_aaThreat = 2
                        } else if (best_aa >= 40) {
                	        
                            best_aaThreat = 1
                        }

                        if (wins_bb >= 50) {
                            wins_bbThreat = 3
                        } else if (wins_bb >= 20) {
                            wins_bbThreat = 2
                        } else if (wins_bb >= 1) {
                            wins_bbThreat = 1
                        }

                        if (wins_de >= 50) {
                            wins_deThreat = 3
                        } else if (wins_de >= 20) {
                            wins_deThreat = 2
                        } else if (wins_de >= 1) {
                            wins_deThreat = 1
                        }

                        if (wins_pr >= 50) {
                            wins_prThreat = 3
                        } else if (wins_pr >= 20) {
                            wins_prThreat = 2
                        } else if (wins_pr >= 1) {
                            wins_prThreat = 1
                        }

          

                        const overallThreatLevel = Math.round(threatLevel)
                        nameElement.innerHTML = ""

                        if (config.youTag && name == config.user) {
                            nameElement.innerHTML = `<span style="color: ${colors.AQUA};">[Y]</span> `
                        }

                        nameElement.innerHTML += `${ranks[player.monthlyPackageRank == "SUPERSTAR" ? "SUPERSTAR" : undefined || player.newPackageRank || "NON"].replaceAll("{plus_color}", `<span style="color: ${colors[player.rankPlusColor || "RED"]};">+</span>`)}${name}</span>`.replaceAll("{monthly_color}", player["monthlyRankColor"] || "GOLD")
                        
                        if (guild && guild.tag) {
                            nameElement.innerHTML += ` <span style="color: ${colors[guild.tagColor] || colors["GRAY"]};">[${guild.tag}]</span>`
                        }

                        threatElement.innerHTML = `<span style="color: ${colors[threatColors[overallThreatLevel]]}">${threatNames[overallThreatLevel]}</span>`
                        totalWinsElement.innerHTML = `<span style="color: ${colors[threatColors[winsThreat]]};">${wins}</span>` || "N/A"
                        bestAlienarcadiumRoundElement.innerHTML = `<span style="color: ${colors[threatColors[best_aaThreat]]};">${best_aa}</span>` || "N/A"
                        winsDeadendElement.innerHTML = `<span style="color: ${colors[threatColors[wins_deThreat]]};">${wins_de}</span>` || "N/A"
                        kdrElement.innerHTML = `<span style="color: ${colors["RED"]};">${kdr}</span>` || "N/A"
                        killsElement.innerHTML = `<span style="color: ${colors["RED"]};">${kills}</span>`
                        personalBestElement.innerHTML = `<span style="color: ${colors["RED"]};">${fastestTime}</span>` || "N/A"
                        winsBadbloodElement.innerHTML = `<span style="color: ${colors[threatColors[wins_bbThreat]]};">${wins_bb}</span>` || "N/A"
                        winsPrisonElement.innerHTML = `<span style="color: ${colors[threatColors[wins_prThreat]]};">${wins_pr}</span>` || "N/A"

                    } else {
                        
                        nameElement.innerHTML = `<span style="color: ${colors["RED"]};">${name} (NICKED)</span>`

                    }

                    userElement.append(threatElement)
                    userElement.append(nameElement)
                    userElement.append(totalWinsElement)
                    userElement.append(bestAlienarcadiumRoundElement)
                    userElement.append(winsBadbloodElement)
                    userElement.append(winsDeadendElement)
                    userElement.append(winsPrisonElement)
                    userElement.append(kdrElement)
                    userElement.append(killsElement)
                    userElement.append(personalBestElement)

                    userElement.className = "user"
                    userElement.id = `user-${name}`

                    userList.append(userElement)

                    users.push(name)
                })
            })
        })

        logReader.on("leave", (name) => {
            const element = document.querySelector(`#user-${name}`)
            if (element)
                element.remove()
        })
    } else {
        window.location.href = "./options.htm"
    }
})