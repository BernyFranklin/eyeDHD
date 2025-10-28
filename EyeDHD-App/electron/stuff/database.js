import sqlite from "better-sqlite3";

function open() {
    const db = sqlite('../main.db');

    return db;
}