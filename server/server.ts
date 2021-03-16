import { Server } from "http";
import { ServerMessage, ClientMessage } from "ws-relay/src/common/protocol";
import { generateID } from "ws-relay/src/common/id";
import WebSocket = require("ws");

const log = require("loglevel");

export class RelayServer {
  wss: WebSocket.Server

  // Register an ID -> Connection mapping so that peers can connect to us.
  registrations: Map<string, WebSocket> = new Map<string, WebSocket>();

  // Track who is connected to who.
  connections: Map<WebSocket, Map<string, WebSocket>> = new Map<WebSocket, Map<string, WebSocket>>();

  constructor(port: number) {
    this.wss = new WebSocket.Server({
      port: port,
    });

    function send(conn: WebSocket, message: ServerMessage) {
      let data = JSON.stringify(message);
      log.debug(`Sent message: ${data}.`);
      conn.send(data);
    }

    this.wss.on("connection", (conn) => {
      this.connections.set(conn, new Map());

      let clientID: string | null;
      conn.on("message", (data: string) => {
        log.debug(`Received data: ${data}.`);
        let msg: ClientMessage = JSON.parse(data);
        if (msg.kind === "register") {
          let id = msg.id || generateID();
          if (clientID) {
            send(conn, {
              kind: "registration-failure",
              message: `Trying to register a socket that is already registered.`,
            });
          } else if (this.registrations.has(id)) {
            send(conn, {
              kind: "registration-failure",
              message: `ID ${id} is already registered.`,
            });
          } else {
            this.registrations.set(id, conn);
            clientID = id;
            send(conn, { kind: "registration-success", id });

            log.info(`Client ${clientID} registered.`);
          }
        } else if (msg.kind === "connect") {
          if (clientID === null) {
            send(conn, {
              kind: "connect-failure",
              peerID: msg.peerID,
              message: `This client is not registered.`,
            });
          } else if (this.registrations.has(msg.peerID)) {
            let peer = this.registrations.get(msg.peerID)!;

            // Send a "peer-connected" message to the peer that we are connecting to.
            send(peer, { kind: "peer-connected", peerID: clientID });
            this.connections.get(peer)?.set(clientID, conn);

            // Send a "connect-success" message back to the peer that sent the request.
            send(conn, { kind: "connect-success", peerID: msg.peerID });
            this.connections.get(conn)?.set(msg.peerID, peer);

            log.info(
              `Connection established between ${clientID} and ${msg.peerID}.`
            );
          } else {
            send(conn, {
              kind: "connect-failure",
              peerID: msg.peerID,
              message: `Could not find peer ID ${msg.peerID}.`,
            });
          }
        } else if (msg.kind === "send") {
          if (clientID === null) {
            send(conn, {
              kind: "send-failure",
              peerID: msg.peerID,
              message: `This client is not registered.`,
            });
          } else if (!this.connections.get(conn)?.has(msg.peerID)) {
            send(conn, {
              kind: "send-failure",
              peerID: msg.peerID,
              message: `This client is not connected to peer ${msg.peerID}.`,
            });
          } else {
            let peer = this.connections.get(conn)?.get(msg.peerID)!;
            send(peer, { kind: "peer-data", peerID: clientID, data: msg.data });
          }
        } else if (msg.kind === "close") {
          if (clientID === null) {
            log.debug("Tried to close connection before registration.");
          } else if (!this.connections.get(conn)?.has(msg.peerID)) {
            log.debug("Tried to close connection that doesn't exist.");
          } else {
            let peer = this.connections.get(conn)?.get(msg.peerID)!;
            send(peer, { kind: "peer-disconnected", peerID: clientID });

            // Delete me from my peer's list of connections.
            this.connections.get(peer)?.delete(clientID);

            // Delete peer from my list of connections.
            this.connections.get(conn)?.delete(msg.peerID);

            log.info(
              `Connection terminated between ${clientID} and ${msg.peerID}.`
            );
          }
        }
      });

      conn.on("close", () => {
        // We only have cleanup if the client has registered.
        if (clientID) {
          log.info(`Client ${clientID} disconnected.`);

          // Send a peer disconnected message to all of our peers.
          let peers = this.connections.get(conn)!;
          for (let [id, peer] of peers.entries()) {
            send(peer, { kind: "peer-disconnected", peerID: clientID });

            // Delete me from my peer's list of connections.
            this.connections.get(peer)?.delete(clientID);
          }

          // Clear state in global maps.
          this.registrations.delete(clientID);
        }

        this.connections.delete(conn);
      });
    });
  }

  close() {
    this.wss.close();
  }
}
