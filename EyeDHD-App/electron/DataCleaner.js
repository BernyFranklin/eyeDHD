import fs from 'fs'
import { pipeline, Writable } from 'stream'
import { parse, transform } from 'csv'

/**
 * DataCleaner reads raw csv data from a file and returns cleaned csv objects
 */
export default class DataCleaner {
    filename
    csvRows = []
    row = 0

    constructor(filename) {
        this.filename = filename
    }

    clean() {
        // Create file stream
        const stream = fs.createReadStream(this.filename, 'utf-8')

        // Takes raw file data and converts it into an array of csv objects
        const parser = parse({
            bom: true,
            columns: true,
            relaxColumnCount: true,
            skipEmptyLines: true
        })

        // Cleans each csv objects returned by the parser
        const transformer = transform((record) => {
            // Clean data here
            let cleaned = record

            return cleaned
        })

        // Collect cleaned csv objects into csvRows
        const content = this.csvRows
        const collector = new Writable({
            objectMode: true,
            write(chunk, _, callback) {
                content.push(chunk)
                callback()
            }
        });

        // Start a chain of stream -> parser -> transformer running in the background
        pipeline(stream, parser, transformer, collector, (err) => {
            if (err) throw err
        })
    }

    // Read one cleaned row one at a time
    //
    // Make this so it waits until new data is available
    async getCleanedRow() {
        return new Promise((resolve, reject) => {
            if (this.csvRows.length <= 0) {
                return reject("csvRows is empty, have you called clean()?");
            }
            if (this.row >= this.csvRows.length) {
                return resolve(null)
            }

            const row = this.row;
            this.row++

            return resolve(this.csvRows[row])
        })
    }
}