import process from 'node:process'
import fs from 'fs'
import { pipeline } from 'stream'
import { finished } from 'stream/promises'
import { parse, transform, stringify } from 'csv'

export default class DataCleaner {
    filename;

    constructor(filename) {
        this.filename = filename
    }

    async run() {
        const stream = fs.createReadStream(this.filename, 'utf-8')

        const content = [];
        const parser = parse({
            bom: true,
            columns: true,
            relaxColumnCount: true,
            skipEmptyLines: true
        })

        const transformer = transform((record) => {
            content.push(record)
        })

        //const stringifier = stringify({
        //    header: true,
        //    delimiter: ','
        //}, (err, data) => {
        //})
        pipeline(stream, parser, transformer,/*stringifier,*/ (err) => {
            if (err) console.log(err)
        })

        const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
        await delay(10000)
        return content
    }
}