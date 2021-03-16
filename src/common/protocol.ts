// Represents a message from the client to the server.
export type ClientMessage = {
    kind: 'register',
    id?: string
} | {
    kind: "connect",
    peerID: string,
} | {
    kind: "send",
    peerID: string,
    data: any
} | {
    kind: "close",
    peerID: string
};


// Represents a message from the server to the client.
export type ServerMessage = {
    kind: "registration-success",
    id: string,
} | {
    kind: "registration-failure",
    message: string
} | {
    kind: "connect-failure",
    peerID: string,
    message: string
} | {
    kind: "connect-success",
    peerID: string,
} | {
    kind: "peer-connected",
    peerID: string,
} | {
    kind: "peer-disconnected",
    peerID: string
} | {
    kind: "peer-data",
    peerID: string,
    data: any
} | {
    kind: "send-failure",
    peerID: string,
    message: string,
};
