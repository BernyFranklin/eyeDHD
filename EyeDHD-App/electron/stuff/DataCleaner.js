import fs from 'fs';
import rl from 'readline';

import { sleep } from '../utils.js';

/**
 *
 */
export default class DataCleaner {
    stream;
    readline;
    iter;
    buf_len;
    buf = [];
    header = [];
    reading = false;
    done = false;
    closed = false;

    /**
     *
     */
    constructor({ path, buf_len = 200 }) {
        this.stream = fs.createReadStream(path, { encoding: 'utf-8' });
        this.readline = rl.createInterface({
            input: this.stream,
            crlfDelay: Infinity
        });
        this.iter = this.readline[Symbol.asyncIterator]();
        this.buf_len = buf_len;


        // Read CSV columns
        this.iter.next().then(({ value, done }) => {
            if (done) {
                this.close();
                throw new Error('File is empty');
            }

            this.header = value.split(',').map(name => name.trim());
        }).catch(error => {
            this.close();
            throw error;
        });

        // Load first batch of rows
        this.loadRows(this.buf_len).then().catch(error => {
            this.close();
            throw error;
        });
    }

    /**
     *
     */
    close() {
        if (this.closed) {
            return;
        }
        this.readline.close();
        this.stream.close();
        this.reading = false;
        this.done = true;
        this.closed = true;
    }

    /**
     *
     */
    async loadRows(count) {
        try {
            this.reading = true;

            while (this.buf.length < count) {
                const { value, done } = await this.iter.next();
                if (done) {
                    this.done = true;
                    this.close();
                    break;
                }

                const cleaned = this.cleanRow(value)
                this.buf.push(cleaned)
            }

            this.reading = false;
        } catch (error) {
            this.close();
            throw error;
        }
    }

    /**
     *
     */
    cleanRow(dirty) {
        const cleaned = {};
        const values = dirty.split(',').map(value => value.trim());

        this.header.forEach((column, index) => {
            switch (column) {
                case 'Frame':
                case 'LeftPupilDiameterInMM':
                case 'RightPupilDiameterInMM': {
                    cleaned[column] = Number(values[index]);
                }
            }
        });

        return cleaned;
    }

    /**
     *
     */
    async getRow() {
        try {
            if (this.done) {
                return null;
            }

            while (this.buf.length <= 0) {
                await sleep(10);
            }

            const row = this.buf.shift();

            if (this.buf.length <= 0) {
                this.loadRows(this.buf_len).catch(error => {
                    this.close();
                    throw error;
                });
            }

            return row;
        } catch (error) {
            throw error;
        }
    }

    /**
     *
     */
    async getBuffer() {
        while (this.buf.length === 0 || this.reading) {
            if (this.done) {
                return null;
            }
            await sleep(10);
        }

        const out = this.buf;
        this.buf = [];

        if (!this.done) {
            this.loadRows(this.buf_len).catch(error => {
                this.close();
                throw error;
            });
        }

        return out;
    }
}