import { RelayServer } from "./server";
import { RelayClient } from "ws-relay/src/client";

let server: RelayServer | null;
beforeEach(() => {
  server = new RelayServer(3000);
});

afterEach(() => {
  server!.close();
});

function connectionsSize(): number { return server!.connections.size; }
function registrationsSize(): number { return server!.registrations.size; }

function connectionsForId(id: string) {
  return server!.connections.get(server!.registrations.get(id)!)!;
}

test("Create and teardown server.", () => {
  expect(connectionsSize()).toBe(0);
  expect(registrationsSize()).toBe(0);
});

test("Create and register one client - let serve pick ID.", (done) => {
  let client = new RelayClient("ws://localhost:3000");
  client.on("open", (id) => {
    expect(id).toBeDefined();

    expect(connectionsSize()).toBe(1);
    expect(registrationsSize()).toBe(1);
    expect(connectionsForId(id).size).toBe(0);

    done();
  });
});

test("Create and register one client - let client pick ID.", (done) => {
  let client = new RelayClient("ws://localhost:3000", "TEST");
  client.on("open", (id) => {
    expect(id).toBe("TEST");

    expect(connectionsSize()).toBe(1);
    expect(registrationsSize()).toBe(1);
    expect(connectionsForId(id).size).toBe(0);

    done();
  });
});

test("Two clients register with same ID.", (done) => {
  let client1 = new RelayClient("ws://localhost:3000", "TEST");
  let client2 = new RelayClient("ws://localhost:3000", "TEST");
  client1.on("open", (id) => {
    expect(id).toBe("TEST");
  });

  client2.on("error", () => {
    expect(connectionsSize()).toBe(2);
    expect(registrationsSize()).toBe(1);
    expect(connectionsForId("TEST").size).toBe(0);

    done();
  })
});

test("Two clients talk to each other.", (done) => {
  let client1 = new RelayClient("ws://localhost:3000");
  client1.on("open", () => {
    expect(connectionsSize()).toBe(1);
    expect(registrationsSize()).toBe(1);
    expect(connectionsForId(client1.id!).size).toBe(0);

    let client2 = new RelayClient("ws://localhost:3000");

    client2.on("open", async () => {
      expect(connectionsSize()).toBe(2);
      expect(registrationsSize()).toBe(2);
      expect(connectionsForId(client1.id!).size).toBe(0);
      expect(connectionsForId(client2.id!).size).toBe(0);

      let conn2 = await client2.connect(client1.id!);
      conn2.send("TEST 2->1");

      conn2.on("message", (msg) => {
        expect(msg).toBe("TEST 1->2");
        conn2.close();
      });
    });

    client1.on("connection", (conn) => {
      expect(connectionsSize()).toBe(2);
      expect(registrationsSize()).toBe(2);
      expect(connectionsForId(client1.id!).size).toBe(1);
      expect(connectionsForId(client2.id!).size).toBe(1);

      expect(connectionsForId(client1.id!).has(client2.id!)).toBe(true);
      expect(connectionsForId(client2.id!).has(client1.id!)).toBe(true);

      conn.on("message", (msg) => {
        expect(msg).toBe("TEST 2->1");
        conn.send("TEST 1->2");
      });

      conn.on("close", () => {
        expect(connectionsSize()).toBe(2);
        expect(registrationsSize()).toBe(2);
        expect(connectionsForId(client1.id!).size).toBe(0);
        expect(connectionsForId(client2.id!).size).toBe(0);

        done();
      });
    });
  })
});


test("Clean up state if client unexpectedly disconnects.", (done) => {
  let client1 = new RelayClient("ws://localhost:3000");
  client1.on("open", () => {
    let client2 = new RelayClient("ws://localhost:3000");

    client2.on("open", async () => {
      let conn2 = await client2.connect(client1.id!);
      client2.close();
    });

    client1.on("connection", (conn) => {
      conn.on("close", () => {
        expect(connectionsSize()).toBe(1);
        expect(registrationsSize()).toBe(1);
        expect(connectionsForId(client1.id!).size).toBe(0);

        done();
      });
    });
  })
});
