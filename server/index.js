import express from "express";
import logger from "morgan";
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import dotenv from "dotenv";
import { createClient } from "@libsql/client";

const port = process.env.PORT ?? 3000
const app = express();
const server = createServer(app);
dotenv.config();
const io = new Server(server);
const db = createClient({
    url: "libsql://settled-mastermind-milagrosdoldan.turso.io",
    authToken: process.env.DB_TOKEN
});

await db.execute(
    `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        user TEXT
    )`
);

app.use(logger('dev'));

io.on('connection', async (socket) => {
    console.log("User has been onny");

    socket.on('disconnect', () => {
        console.log('an user has disconnected')
    })

    socket.on('chat message', async (msg) => {
        let result;
        try {
            result = await db.execute({
                sql: `INSERT INTO messages (content) VALUES (:msg)`,
                args: { msg }
            })
        } catch (e) {
            console.log(e);
            return;

        }
        io.emit("chat message", msg, result.lastInsertRowid.toString());
    })

    if (!socket.recovered) {
        let results;
        try {
            results = await db.execute({
                sql: 'SELECT id, content FROM messages WHERE id > ?',
                args: [socket.handshake.auth.serverOffset]
            });
            console.log(results, "results")
            results.rows.forEach(row => {
                socket.emit("chat message", row.content, row.id.toString)
            });

        } catch (e) {

        }
    }

})


app.get("/", (req, res) => {
    res.sendFile(process.cwd() + "/client/index.html")
})


server.listen(port, () => {
    console.log(`LISTEN ON PORT ${port}`)
})