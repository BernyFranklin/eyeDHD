import fs from 'fs';
import rl from 'readline';

import { sleep } from '../utils.js';

/**
 * Reads and cleans a CSV file at the given path. Cleans data lazyily,
 * keeping a buffer of buf_len cleaned rows
 *
 * The first line of the CSV file must be the column names
 */
export default class DataCleaner {
    stream;
    readline;
    iter;
    buf_len;
    buf = [];
    header = [];
    status = {
        reading: false,
        done: false,
        closed: false
    };

    constructor({ path, buf_len = 200 }) {
        // Open file as a stream and setup line-by-line reading
        this.stream = fs.createReadStream(path, { encoding: 'utf-8' });
        this.readline = rl.createInterface({
            input: this.stream,
            crlfDelay: Infinity
        });
        this.iter = this.readline[Symbol.asyncIterator]();
        this.buf_len = buf_len;

        // Read column names
        this.iter.next().then(({ value, done }) => {
            if (done) {
                this.close();
                throw new Error('File is empty');
            }

            this.header = value.split(',').map(name => name.trim());
        }).catch(err => {
            this.close();
            throw err;
        });

        // Load first batch of rows
        this.loadRows(this.buf_len).then().catch(err => {
            this.close();
            throw err;
        });
    }

    /**
     * Closes the file stream and readline interface
     */
    close() {
        if (this.status.closed) {
            return;
        }
        this.readline.close();
        this.stream.close();
        this.status.reading = false;
        this.status.done = true;
        this.status.closed = true;
    }

    /**
     * Loads buf_len cleaned rows into the internal buffer
     */
    async loadRows(count) {
        try {
            this.status.reading = true;

            while (this.buf.length < count) {
                const { value, done } = await this.iter.next();
                if (done) {
                    this.status.done = true;
                    this.close();
                    break;
                }

                const cleaned = this.cleanRow(value)
                this.buf.push(cleaned)
            }

            this.status.reading = false;
        } catch (err) {
            this.close();
            throw err;
        }
    }

    /**
     * Cleans a row of CSV data, converting it from a string to JSON
     *
     * @TODO: finish cleaning algorithm
     */
    cleanRow(raw) {
        // const trueVals = new Set(['true', 'yes', 'y', '1']);
        // const falseVals = new Set (['false', 'no', 'n', '0']);
        // const nullish = new Set (['', 'NA', 'N/A', null, 'NaN']);

        // function parseCsvLine(line) {
        //     const out = []
        //     const s = String(line).replace(/\r$/, '');
        //     let field = '';
        //     let inQuotes = false;

        //     for (let i = 0; i < s.length; i++) {
                
        //     }
        // }
        const cleaned = {};
        const values = raw.split(',').map(value => value.trim());

        this.header.forEach((column, index) => {
            cleaned[column] = values[index];
        });

        return cleaned;
    }

    /**
     * Gets a row of cleaned data from the internal buffer
     *
     * @returns a cleaned row, or null if the entire file has been read
     */
    async getRow() {
        try {
            if (this.status.done) {
                return null;
            }

            while (this.buf.length <= 0) {
                await sleep(10);
            }

            const row = this.buf.shift();

            if (this.buf.length <= 0) {
                this.loadRows(this.buf_len).catch(err => {
                    this.close();
                    throw err;
                });
            }

            return row;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Gets the cleaners internal buffer and begins filling new data into it's buffer
     *
     * @returns an array of rows, or null if the entire file has been read
     */
    async getBuffer() {
        if (this.status.done) {
            return null;
        }

        while (this.buf.length === 0 || this.status.reading) {
            if (this.status.done) {
                const out = this.buf;
                this.buf = [];
                return out;
            }
            await sleep(10);
        }

        const out = this.buf;
        this.buf = [];

        if (!this.status.done) {
            this.loadRows(this.buf_len).catch(err => {
                this.close();
                throw err;
            });
        }

        return out;
    }
}
