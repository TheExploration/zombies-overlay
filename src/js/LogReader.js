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


"use strict"

const EventEmitter = require("events")
const fs = require("fs")

class LogReader extends EventEmitter {
    path
    constructor(path) {
        super()

        this.path = path
        this.watch()
    }

    watch = () => {
        let lastLog = []
        let changedLogs = []
        fs.watchFile(this.path, {persistent: true, interval: 4}, (curr, prev) => {
            const logFile = fs.readFileSync(this.path, {encoding: "utf8"})

            const logs = logFile.split("\n")
            if (lastLog.length > 0) {
                for (let i = 0; i < logs.length; i++) {
                    if (logs[i] != lastLog[i]) {
                        changedLogs.push(logs[i])
                    }
                }
            }

            lastLog = logs
            const interestedMsgs = changedLogs.filter(log => /\[[^]*\] \[Client thread\/INFO\]: \[CHAT\] [^]*/.test(log))
            for (const latestLog of interestedMsgs) {
                const message = latestLog.split('[CHAT] ')[1].trim()
                if (/Sending you to (.*)!/.test(message) || /(.*): -clear/.test(message)) {
                    console.log(message)
                    this.emit("server_change")
                } else if (/(.*): -s (.*?)/.test(message)) {
                    this.emit("join", message.split("-s ")[1])
                } else {
                    const parts = message.split(' ')

                    if (/(.*) joined \((\d)\/(\d)\)!/.test(message)) {
                        this.emit("join", parts[0])
                    } else if (/ONLINE: (.*?)/.test(message)) {
                        this.emit("server_change")
                        parts.slice(1).forEach(msg => this.emit("", msg.replace(',', '')))
                    } else if (/(.*) has quit!/.test(message)) {
                        this.emit("leave", parts[0])
                    }
                }
            }
        })
    }
}

module.exports = LogReader