/**
 * Database connection — three runtime modes
 *
 * Mode A  MONGODB_URI set (Docker Compose / Atlas / local mongod RS):
 *   Connects directly to the given URI. The URI must point to a Replica Set or
 *   sharded cluster — standalone mongod does NOT support Change Streams because
 *   it has no oplog.
 *
 * Mode B  No MONGODB_URI, NODE_ENV !== "production" (pnpm dev, CI):
 *   Starts an in-process single-node Replica Set via MongoMemoryReplSet.
 *   Zero infra setup, ephemeral (data lost on restart), CI-friendly.
 *   Dynamic import keeps mongodb-memory-server out of the production bundle.
 *
 * Mode C  No MONGODB_URI, NODE_ENV === "production":
 *   Fails fast with a clear error. A production container must always have
 *   MONGODB_URI injected (via AWS SSM / ECS secrets).
 *
 * Design decision — why not run a self-hosted RS on EC2:
 *   Managing a 3-node RS on EC2 requires patching, failover monitoring, backups,
 *   and security hardening. MongoDB Atlas handles all of this with a free-tier M0
 *   cluster that supports Change Streams. Operational simplicity wins.
 */

import mongoose from "mongoose"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let replSet: any = null

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI
  const isProd = process.env.NODE_ENV === "production"

  if (uri) {
    await mongoose.connect(uri)
    console.log("[db] Connected:", uri.replace(/\/\/.*@/, "//<credentials>@"))
    return
  }

  if (isProd) {
    throw new Error(
      "MONGODB_URI is required in production. " +
        "Inject it via AWS SSM / ECS task secrets. " +
        "The URI must point to a Replica Set (Atlas M0+) for Change Streams to work.",
    )
  }

  // Mode B — in-process RS for local dev / CI
  const { MongoMemoryReplSet } = await import("mongodb-memory-server")
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  })

  const rsUri = replSet.getUri() as string
  await mongoose.connect(rsUri)
  console.log("[db] In-process MongoDB Replica Set started (Change Streams enabled)")
  console.log("[db] Tip: set MONGODB_URI to skip this and use a persistent RS")
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect()
  if (replSet) {
    await (replSet.stop as () => Promise<void>)()
    replSet = null
  }
}
