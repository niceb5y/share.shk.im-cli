import process from 'process'

const removeFile = (
  S3: AWS.S3,
  DocClient: AWS.DynamoDB.DocumentClient
) => async (id: string) => {
  const resolvedId = id.replace(`https://${process.env.SERVER_HOSTNAME}/`, '')
  console.log(resolvedId)
  let filename = ''

  try {
    const data = await DocClient.get({
      TableName: process.env.DB_TABLE_NAME as string,
      Key: {
        id: resolvedId
      }
    }).promise()

    if (data.Item && data.Item.filename) {
      filename = decodeURI(data.Item.filename)
    } else throw 'FileNotExist'
  } catch {
    console.error('File not exist.')
    process.exit(1)
  }

  try {
    await S3.deleteObjects({
      Bucket: process.env.S3_BUCKET_NAME as string,
      Delete: {
        Objects: [
          { Key: `${resolvedId}/${filename}` },
          { Key: `${resolvedId}` }
        ]
      }
    }).promise()
  } catch {
    console.error('File deletion error occured.')
    process.exit(1)
  }

  try {
    await DocClient.delete({
      TableName: process.env.DB_TABLE_NAME as string,
      Key: {
        id: resolvedId
      }
    }).promise()
  } catch {
    console.error('DB deletion error occured.')
    process.exit(1)
  }

  console.log(`Success. File ${filename} removed.`)

  process.exit(0)
}

export default removeFile
