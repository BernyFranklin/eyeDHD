import fs from 'fs'
import { pipeline, Writable } from 'stream'
import { parse, transform } from 'csv'

/** DataCleaner reads raw csv data from a file and returns cleaned csv objects */
export default class DataCleaner {
    filename
    csvRows = []
    row = 0

    constructor(filename) {
        this.filename = filename
    }

    /**
     * Begins asyncronously cleaning the file at **this.filename**,
     * storing the cleaned rows in **this.csvRows**
     */
    start() {
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
        const transformer = transform((uncleanedCsv) => {
            // Clean data here and return cleaned data

            return uncleanedCsv
        })

        // Collect cleaned csv objects into csvRows through content
        const rows = this.csvRows
        const collector = new Writable({
            objectMode: true,
            write(cleanedCsv, _, callback) {
                rows.push(cleanedCsv)
                callback()
            }
        });

        // Start a chain of stream -> parser -> transformer -> collector running in the background
        pipeline(stream, parser, transformer, collector, (err) => {
            if (err) throw err
            // End of file reached
        })
    }

    /**
     * Read one cleaned row one at a time, returning a promise that resolves
     * to a row of cleaned data if available, or null if the end of file has
     * been reached
     */
    async getCleanedRow() {
        // TODO: Needs some way to tell when data is available and when the end of file
        // has been reached
        return new Promise((resolve, reject) => {
            // No data available yet
            if (this.csvRows.length <= 0) {
                return reject("csvRows is empty, have you called clean()?");
            }

            // End of file
            if (this.row >= this.csvRows.length) {
                return resolve(null)
            }

            // Data available

            const row = this.row
            this.row++

            return resolve(this.csvRows[row])
        })
    }
}
