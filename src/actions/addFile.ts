import path from 'path'
import fs from 'fs'
import process from 'process'
import crypto from 'crypto'
import child_process from 'child_process'

import chalk from 'chalk'
import shortid from 'shortid'
import filesize from 'filesize'

const addFile = (S3: AWS.S3, DocClient: AWS.DynamoDB.DocumentClient) => async (
  filePath: string
) => {
  const resolvedFilePath = path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(resolvedFilePath)) {
    console.error(`${resolvedFilePath} is not exist.`)
    process.exit(1)
  }
  if (!fs.statSync(resolvedFilePath).isFile()) {
    console.error(`${resolvedFilePath} is not a file.`)
    process.exit(1)
  }

  const id = shortid.generate()
  const basename = path.basename(resolvedFilePath)

  try {
    await S3.upload({
      Bucket: process.env.S3_BUCKET_NAME as string,
      Key: `${id}/${basename}`,
      Body: fs.createReadStream(resolvedFilePath)
    }).promise()
  } catch {
    console.error('S3 upload failed.')
    process.exit(1)
  }

  try {
    await DocClient.put({
      TableName: process.env.DB_TABLE_NAME as string,
      Item: {
        id: id,
        filename: encodeURI(basename),
        hash: crypto
          .createHash('sha256')
          .update(fs.readFileSync(resolvedFilePath))
          .digest('hex'),
        date: Math.floor(+new Date() / 1000),
        size: filesize(fs.statSync(resolvedFilePath).size)
      }
    }).promise()
  } catch {
    console.error('DynamoDB insert failed.')
    process.exit(1)
  }

  const resultURL = `https://${process.env.SERVER_HOSTNAME}/${id}`
  const proc = child_process.spawn('pbcopy')
  proc.stdin.write(resultURL)
  proc.stdin.end()
  console.log('Success. Copied to clipboard.')
  console.log(chalk.blue(resultURL))
  process.exit(0)
}

export default addFile
