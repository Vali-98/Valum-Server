const express = require('express')
const ping = require('ping')
const wol = require('wake_on_lan')
const ssh2 = require('ssh2').Client
require('dotenv').config()

const app = express()
app.use(express.json())

// Environment variables
const macAddress = process.env.MAC_ADDRESS
const deviceIP = process.env.IP_ADDRESS
const sshUser = process.env.SSH_USER
const sshPassword = process.env.SSH_PASSWORD
const serverPort = process.env.VALUM_PORT || '3000'
const apiKey = process.env.API_KEY

const missingVars = []

if (!macAddress) missingVars.push('MAC_ADDRESS')
if (!deviceIP) missingVars.push('IP_ADDRESS')
if (!sshUser) missingVars.push('SSH_USER')
if (!sshPassword) missingVars.push('SSH_PASSWORD')

if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
}
// API Key Authentication Middleware
function apiKeyAuth(req, res, next) {
    const providedApiKey = req.header('Authorization')

    if (!providedApiKey || providedApiKey !== `Bearer ${apiKey}`) {
        return res.status(403).json({ message: 'Forbidden: Invalid API Key' })
    }
    next()
}

// Use the API key auth middleware for all routes
if (apiKey) app.use(apiKeyAuth)

// WOL Endpoint
app.post('/wol', (req, res) => {
    wol.wake(macAddress, (error) => {
        if (error) {
            return res.status(500).json({ message: 'Error sending WOL packet', error })
        }
        res.status(200).json({ message: 'WOL packet sent successfully' })
    })
})

// Check Mac active status Endpoint
app.get('/status', (req, res) => {
    ping.sys.probe(deviceIP, (isAlive, err) => {
        res.status(200).json({ active: isAlive })
    })
})

// Shutdown Mac Endpoint
app.post('/shutdown', (req, res) => {
    const conn = new ssh2()
    conn.on('ready', () => {
        conn.exec('sudo shutdown -h now', (err, stream) => {
            if (err) {
                return res.status(500).json({ message: 'Error shutting down Mac', error: err })
            }
            stream.on('close', (code, signal) => {
                conn.end()
                if (code === 0) {
                    res.status(200).json({ message: 'Mac shutdown successfully' })
                } else {
                    res.status(500).json({ message: 'Error shutting down Mac' })
                }
            })
        })
    })
        .on('error', (err) => {
            res.status(500).json({ message: 'SSH connection error', error: err })
        })
        .connect({
            host: deviceIP,
            port: 22,
            username: sshUser,
            password: sshPassword,
        })
})

app.post('/sleep', (req, res) => {
    const conn = new ssh2()

    conn.on('ready', () => {
        detectOS(conn)
            .then((os) => {
                const sleepCommand = getSleepCommand(os)
                if (!sleepCommand) {
                    throw new Error(`Unsupported OS: ${os}`)
                }
                return execCommand(conn, sleepCommand)
            })
            .then(() => {
                res.status(200).json({ message: 'Device sleeping successfully.' })
            })
            .catch((err) => {
                res.status(500).json({ message: err.message })
            })
            .finally(() => {
                conn.end()
            })
    })
        .on('error', (err) => {
            res.status(500).json({ message: 'SSH connection error', error: err.message })
        })
        .connect({
            host: deviceIP,
            port: 22,
            username: sshUser,
            password: sshPassword,
        })
})

function detectOS(conn) {
    return new Promise((resolve, reject) => {
        execCommand(conn, 'uname')
            .then((output) => resolve(output.trim()))
            .catch(reject)
    })
}

function getSleepCommand(os) {
    switch (os) {
        case 'Darwin':
            return `osascript -e 'tell application "System Events" to sleep'` // macOS
        case 'Linux':
            return 'systemctl suspend' // Linux
        default:
            return null
    }
}

function execCommand(conn, command) {
    return new Promise((resolve, reject) => {
        conn.exec(command, (err, stream) => {
            if (err) return reject(err)

            let output = ''
            stream.on('data', (data) => {
                output += data.toString()
            })
            stream.on('close', (code) => {
                if (code === 0) {
                    resolve(output)
                } else {
                    reject(new Error(`Command "${command}" failed with code ${code}`))
                }
            })
        })
    })
}

app.listen(serverPort, () => {
    console.log(`Express server running on port ${serverPort}`)
})
