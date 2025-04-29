# Valum Server

A simple server to be used alongside the [Valum Client](https://github.com/Vali-98/Valum-Client).

### Usage

By default, Valum Server uses `PORT=3000`

The Valum Server is a simple express server that has 3 endpoints:

| Endpoint    | Method | Description                                | Response                |
| ----------- | ------ | ------------------------------------------ | ----------------------- |
| `/ping`     | GET    | Sends a ping to the server                 | `{ "active": boolean }` |
| `/wol`      | POST   | Sends a Wake-On-LAN packet to the device   | `{ "message": string }` |
| `/shutdown` | POST   | Sends a shutdown SSH request to the device | `{ "message": string }` |

### Configuration

The following environment variables can be set for Docker-Compose setups:

| Environment Variable | Required | Description                                           |
| -------------------- | -------- | ----------------------------------------------------- |
| `MAC_ADDRESS`        | Yes      | MAC address of the target device                      |
| `IP_ADDRESS`         | Yes      | IP address of the target device                       |
| `SSH_USER`           | Yes      | SSH username for the device                           |
| `SSH_PASSWORD`       | Yes      | SSH password for the device                           |
| `VALUM_PORT`         | No       | Port for the express server                           |
| `API_KEY`            | No       | Optional API key for authentication or access control |

