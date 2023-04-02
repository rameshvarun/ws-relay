import { RelayServer } from "./server";

let server = new RelayServer(parseInt(process.env.PORT || "3000"));
