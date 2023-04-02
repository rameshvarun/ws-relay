import { ServerMessage, ClientMessage } from "../../ws-relay-common/protocol";
import log from "loglevel";
const EventEmitter = require("eventemitter3");

export {generateID} from "../../ws-relay-common/id";

export class RelayConnection extends EventEmitter {
  id: string;
  client: RelayClient;

  constructor(id: string, client: RelayClient) {
    super();
    this.id = id;
    this.client = client;
  }

  send(data: any) {
    let req: ClientMessage = { kind: "send", peerID: this.id, data };
    this.client.ws!.send(JSON.stringify(req));
  }

  close() {
    this.client.closeConnection(this);
  }
}

export class RelayClient extends EventEmitter {
  id: string | null = null;
  ws: WebSocket;

  connections: Map<string, RelayConnection> = new Map();

  constructor(server: string, requestedID?: string) {
    super();

    this.ws = new WebSocket(server);

    this.ws.addEventListener("open", () => {
      let req: ClientMessage = { kind: "register", id: requestedID };
      this.ws!.send(JSON.stringify(req));
    });

    this.ws.addEventListener("message", (ev: MessageEvent) => {
        log.debug(ev.data)
    });

    this.ws.addEventListener("error", (e) => this.emit("error", e));
    this.ws.addEventListener("close", (e) => this.emit("close", e));

    let registrationReceiver = (ev: MessageEvent) => {
      let msg: ServerMessage = JSON.parse(ev.data);

      if (msg.kind === "registration-success") {
        this.id = msg.id;
        this.ws!.removeEventListener("message", registrationReceiver);
        this.emit("open", this.id);
      } else if (msg.kind === "registration-failure") {
        this.ws!.addEventListener("message", registrationReceiver);
        this.emit("error", new Error(`Failed to register: ${msg.message}`));
      }
    };
    this.ws!.addEventListener("message", registrationReceiver);

    this.ws!.addEventListener("message", (ev: MessageEvent) => {
      let msg: ServerMessage = JSON.parse(ev.data);

      if (msg.kind === "peer-connected") {
        let connection = new RelayConnection(msg.peerID, this);
        this.connections.set(msg.peerID, connection);
        this.emit("connection", connection);
      } else if (msg.kind === "peer-data") {
        this.connections.get(msg.peerID)!.emit("message", msg.data);
      } else if (msg.kind === "peer-disconnected") {
        let connection = this.connections.get(msg.peerID)!;
        connection.emit("close");
        this.connections.delete(connection.id);
      }
    });
  }

  closeConnection(connection: RelayConnection) {
    let req: ClientMessage = { kind: "close", peerID: connection.id };
    this.ws!.send(JSON.stringify(req));

    connection.emit("close");
    this.connections.delete(connection.id);
  }

  close() {
    this.ws!.close();
  }

  connect(peerID: string): Promise<RelayConnection> {
    return new Promise((resolve, reject) => {
      let req: ClientMessage = { kind: "connect", peerID: peerID };
      this.ws.send(JSON.stringify(req));

      this.ws.addEventListener("message", (ev: MessageEvent) => {
        let msg: ServerMessage = JSON.parse(ev.data);

        if (msg.kind === "connect-success" && msg.peerID === peerID) {
          let connection = new RelayConnection(msg.peerID, this);
          this.connections.set(peerID, connection);
          resolve(connection);
        } else if (msg.kind === "connect-failure" && msg.peerID === peerID) {
           this.emit("error", msg.message);
           reject(new Error(msg.message));
        }
      });
    });
  }
}
