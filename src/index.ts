#!/usr/bin/env node

const CLI_APP_VERSION = '1.0.0'

import path from 'path'
import process from 'process'

import AWS from 'aws-sdk'
import dotenv from 'dotenv'
import {program} from 'commander'

import addFile from './actions/addFile'
import removeFile from './actions/removeFile'

dotenv.config({ path: path.resolve(__dirname, '../.env') })
AWS.config.update({
  region: 'ap-northeast-2'
})

const DocClient = new AWS.DynamoDB.DocumentClient()
const S3 = new AWS.S3()

program.version(CLI_APP_VERSION)

program
  .command('add <file>')
  .description('share add file')
  .action(addFile(S3, DocClient))

program
  .command('remove <id>')
  .alias('rm')
  .description('remove shared file')
  .action(removeFile(S3, DocClient))

program.on('command:*', () => {
  console.error(`Invalid command: ${program.args.join(' ')}`)
  process.exit(1)
})

program.parse(process.argv)

if (!program.args.length) {
  program.help()
  process.exit(1)
}
