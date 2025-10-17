import fs from 'fs';
import { pipeline, Writable } from 'stream';
import { finished } from 'stream/promises';
import { parse, transform } from 'csv';

/**
 * DataCleaner reads raw csv data from a file and returns cleaned csv objects
 */
export default class DataCleaner {
    filename;
    content = [];
    row = 0;

    constructor(filename) {
        this.filename = filename;
    }

    async clean() {
        // Create file stream
        const stream = fs.createReadStream(this.filename, 'utf-8');

        // Takes raw file data and converts it into an array of csv objects
        const parser = parse({
            bom: true,
            columns: true,
            relaxColumnCount: true,
            skipEmptyLines: true
        });

        // Cleans csv objects returned by the parser
        const transformer = transform((record) => {
            // Clean data here
            let cleaned = record

            return cleaned;
        });

        // Collect cleaned data into content
        const content = [];
        const collector = new Writable({
            objectMode: true,
            write(chunk, _, callback) {
                content.push(chunk);
                callback();
            }
        });

        // Create a chain of stream -> parser -> transformer and wait for it to finish
        await finished(
            pipeline(stream, parser, transformer, collector, (err) => {
                if (err) throw err;
            })
        );

        this.content = content;
    }

    // Read one cleaned row one at a time
    //
    // Make this so it waits until new data is available
    async getCleanedRow() {
        return new Promise((resolve, reject) => {
            if (this.content.length <= 0) {
                return resolve(null);
            }
            if (this.row >= this.content.length) {
                return resolve(null);
            }

            const row = this.row;
            this.row++;

            return resolve(this.content[row])
        });
    }
}