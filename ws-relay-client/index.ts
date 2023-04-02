import { ServerMessage, ClientMessage } from "@vramesh/ws-relay-common/lib/protocol";
import { TypedEvent } from "@vramesh/ws-relay-common/lib/typedevent";
import log from "loglevel";

export {generateID} from "@vramesh/ws-relay-common/lib/id";

export class RelayConnection {
  id: string;
  client: RelayClient;

  onClose: TypedEvent<void> = new TypedEvent();
  onData: TypedEvent<any> = new TypedEvent();

  constructor(id: string, client: RelayClient) {
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

export class RelayClient {
  id: string | null = null;
  ws: WebSocket;

  connections: Map<string, RelayConnection> = new Map();

  onOpen: TypedEvent<string> = new TypedEvent();
  onError: TypedEvent<Error> = new TypedEvent();
  onClose: TypedEvent<void> = new TypedEvent();

  /** This event is fired when a peer opens a connection to us. */
  onConnection: TypedEvent<RelayConnection> = new TypedEvent();

  constructor(server: string, requestedID?: string) {
    this.ws = new WebSocket(server);

    this.ws.addEventListener("open", () => {
      let req: ClientMessage = { kind: "register", id: requestedID };
      this.ws!.send(JSON.stringify(req));
    });

    this.ws.addEventListener("message", (ev: MessageEvent) => {
        log.debug(ev.data)
    });

    this.ws.addEventListener("error", (e) => 
      this.onError.emit(new Error("WebSocket error")));
    this.ws.addEventListener("close", (e) =>
      this.onClose.emit());

    let registrationReceiver = (ev: MessageEvent) => {
      let msg: ServerMessage = JSON.parse(ev.data);

      if (msg.kind === "registration-success") {
        this.id = msg.id;
        this.ws!.removeEventListener("message", registrationReceiver);
        this.onOpen.emit(this.id);
      } else if (msg.kind === "registration-failure") {
        this.ws!.addEventListener("message", registrationReceiver);
        this.onError.emit(new Error(`Failed to register: ${msg.message}`));
      }
    };
    this.ws!.addEventListener("message", registrationReceiver);

    this.ws!.addEventListener("message", (ev: MessageEvent) => {
      let msg: ServerMessage = JSON.parse(ev.data);

      if (msg.kind === "peer-connected") {
        let connection = new RelayConnection(msg.peerID, this);
        this.connections.set(msg.peerID, connection);
        this.onConnection.emit(connection);
      } else if (msg.kind === "peer-data") {
        this.connections.get(msg.peerID)!.onData.emit(msg.data);
      } else if (msg.kind === "peer-disconnected") {
        let connection = this.connections.get(msg.peerID)!;
        connection.onClose.emit();
        this.connections.delete(connection.id);
      }
    });
  }

  closeConnection(connection: RelayConnection) {
    let req: ClientMessage = { kind: "close", peerID: connection.id };
    this.ws!.send(JSON.stringify(req));

    connection.onClose.emit();
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
           this.onError.emit(new Error(`Failed to connect to peer: ${msg.message}`));
           reject(new Error(msg.message));
        }
      });
    });
  }
}
