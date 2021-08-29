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
        minecraftPath: require("minecraft-folder-path")
    }

    let hypixelApi
    let logPath = ""

    if (fs.existsSync(folderPath)) {
        config = JSON.parse(fs.readFileSync(configPath, { encoding: "utf8" }))

        console.log(config)

        hypixelApi = new api.HypixelAPI(config.apiKey)
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
                    const player = res.player

                    console.log(player)
                    const guild = await hypixelApi.getGuild(uuid)

                    const userElement = document.createElement("tr")

                    const threatElement = document.createElement("td")
                    const nameElement = document.createElement("td")
                    const wlrElement = document.createElement("td")
                    const kdrElement = document.createElement("td")
                    const bwsElement = document.createElement("td")
                    const wsElement = document.createElement("td")
                    const winElement = document.createElement("td")
                    const lossElement = document.createElement("td")
                    const aimElement = document.createElement("td")

                    console.log(guild)

                    if (player && player.stats["Arcade"]) {
                        const wins = player.stats["Arcade"]["wins_zombies"] || 0
                        const best_aa = player.stats["Arcade"]["best_round_zombies_alienarcadium"] || 0
                        const wins_bb = player.stats["Arcade"]["wins_zombies_badblood"] || 0
                        const wins_de = player.stats["Arcade"]["wins_zombies_deadend"] || 0
                        const kills = player.stats["Arcade"]["zombie_kills_zombies"] || 0
                        const deaths = player.stats["Arcade"]["deaths_zombies"] || 0
			const kdr = Math.round((kills / deaths) * 100) / 100 || kills

                        let threatLevel = 0
                        let winsThreat = 0
                        let best_aaThreat = 0
                        let wins_bbThreat = 0
                        let wins_deThreat = 0
                        

                        console.log(player.stats["Duels"])
                        
                        if (wins >= 100) {
                            winsThreat = 3
                        } else if (wins >= 50) {            
                            winsThreat = 2
                        } else if (wins >= 3) {
                            winsThreat = 1
                        }

                        if (best_aa >= 100) {
			                threatLevel += 3
                            best_aaThreat = 3
                        } else if (best_aa >= 70) {
                            threatLevel += 2
                            best_aaThreat = 2
                        } else if (best_aa >= 40) {
                	        threatLevel++
                            best_aaThreat = 1
                        }

                        if (wins_bb >= 50) {
                            threatLevel += 3
                            wins_bbThreat = 3
                        } else if (wins_bb >= 20) {
                            threatLevel += 2
                            wins_bbThreat = 2
                        } else if (wins_bb >= 1) {
                            threatLevel++
                            wins_bbThreat = 1
                        }

                        if (wins_de >= 50) {
                            threatLevel += 3
                            wins_deThreat = 3
                        } else if (wins_de >= 20) {
                            threatLevel += 2
                            wins_deThreat = 2
                        } else if (wins_de >= 1) {
                            threatLevel++
                            wins_deThreat = 1
                        }

          

                        const overallThreatLevel = Math.round(threatLevel/3)
                        nameElement.innerHTML = ""

                        if (config.youTag && name == config.user) {
                            nameElement.innerHTML = `<span style="color: ${colors.AQUA};">[Y]</span> `
                        }

                        nameElement.innerHTML += `${ranks[player.monthlyPackageRank == "SUPERSTAR" ? "SUPERSTAR" : undefined || player.newPackageRank || "NON"].replaceAll("{plus_color}", `<span style="color: ${colors[player.rankPlusColor || "RED"]};">+</span>`)}${name}</span>`.replaceAll("{monthly_color}", player["monthlyRankColor"] || "GOLD")
                        if (guild && guild.tag) {
                            nameElement.innerHTML += ` <span style="color: ${colors[guild.tagColor] || colors["GRAY"]};">[${guild.tag}]</span>`
                        }
                        threatElement.innerHTML = `<span style="color: ${colors[threatColors[overallThreatLevel]]}">${threatNames[overallThreatLevel]}</span>`
                        wlrElement.innerHTML = `<span style="color: ${colors[threatColors[winsThreat]]};">${wins}</span>` || "N/A"
                        kdrElement.innerHTML = `<span style="color: ${colors[threatColors[best_aaThreat]]};">${best_aa}</span>` || "N/A"
                        bwsElement.innerHTML = `<span style="color: ${colors[threatColors[wins_deThreat]]};">${wins_de}</span>` || "N/A"
                        wsElement.innerHTML = `<span style="color: ${colors["RED"]};">${kdr}</span>` || "N/A"
                        winElement.innerHTML = `<span style="color: ${colors["RED"]};">${kills}</span>`
                        lossElement.innerHTML = `<span style="color: ${colors["RED"]};">${deaths}</span>`
                        aimElement.innerHTML = `<span style="color: ${colors[threatColors[wins_bbThreat]]};">${wins_bb}</span>` || "N/A"
                    } else {
                        nameElement.innerHTML = `<span style="color: ${colors["RED"]};">${name} (NICKED)</span>`
                    }

                    userElement.append(threatElement)
                    userElement.append(nameElement)
                    userElement.append(wlrElement)
                    userElement.append(kdrElement)
                    userElement.append(aimElement)
                    userElement.append(bwsElement)
                    userElement.append(wsElement)
                    userElement.append(winElement)
                    userElement.append(lossElement)

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