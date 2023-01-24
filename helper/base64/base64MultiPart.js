const path = require("path");
const config = require("../../config.json");
const AWS = require("aws-sdk");
const { S3ReadStream } = require("s3-readstream");
const s3 = new AWS.S3();

let base64MultiPart = async (fileName) => {
  let file = fileName;
  console.log(fileName);
  // let file = fileName;
  // let file = "tor.jpeg";
  const extName = path.extname(file);
  const filename = path.parse(file).name;

  file = filename + extName.toLowerCase();
  if (file !== undefined || file !== null || file !== "") {
    const filename = path.parse(file).name;
    let fileBase64 = "";
    let isRead = false;

    try {
      const downloadParams = {
        Bucket: config.S3_BUCKET_NAME,
        Key: `original/${file}`,
      };

      let uploadId;
      try {
        const params = {
          Bucket: config.S3_BUCKET_NAME,
          Key: `base64/${filename}.base64`,
        };
        const result = await s3.createMultipartUpload(params).promise();
        uploadId = result.UploadId;
        console.info(`multipart created with upload id: ${uploadId}`);
      } catch (e) {
        throw new Error(`Error creating S3 multipart. ${e.message}`);
      }
      console.log("before upload promise");
      const chunkSize = 20 * 1024 * 1024; //300MB
      const uploadPartsPromise = new Promise((resolve, reject) => {
        console.log("inside upload promise");
        s3.headObject(downloadParams, (error, data) => {
          const options = {
            parameters: downloadParams,
            s3,
            maxLength: data.ContentLength,
            byteRange: chunkSize, //300 MB
          };
          // Instantiate the S3ReadStream in place of s3.getObject().createReadStream()
          const readStream = new S3ReadStream(options);

          const multipartMap = { Parts: [] };

          let partNumber = 1;
          let chunkAccumulator = null;

          readStream.on("error", (err) => {
            reject(err);
          });

          readStream.on("data", (chunk) => {
            // it reads in chunks of 64KB. We accumulate them up to 10MB and then we send to S3
            if (chunkAccumulator === null) {
              chunkAccumulator = chunk.toString("base64");
            } else {
              chunkAccumulator = Buffer.concat([
                chunkAccumulator,
                chunk.toString("base64"),
              ]);
            }
            console.log("Chunk Accumulator:" + chunkAccumulator.length);
            if (chunkAccumulator.length > chunkSize) {
              // pause the stream to upload this chunk to S3
              readStream.pause();

              const chunkMB = chunkAccumulator.length / 1024 / 1024;
              console.log("before pause");
              const params = {
                Bucket: config.S3_BUCKET_NAME,
                Key: `base64/${filename}.base64`,
                PartNumber: partNumber,
                UploadId: uploadId,
                Body: chunkAccumulator,
                ContentLength: chunkAccumulator.length,
              };
              s3.uploadPart(params)
                .promise()
                .then((result) => {
                  console.info(
                    `Data uploaded. Entity tag: ${result.ETag} Part: ${params.PartNumber} Size: ${chunkMB}`
                  );
                  multipartMap.Parts.push({
                    ETag: result.ETag,
                    PartNumber: params.PartNumber,
                  });
                  partNumber++;
                  chunkAccumulator = null;
                  // resume to read the next chunk
                  readStream.resume();
                })
                .catch((err) => {
                  console.error(
                    `error uploading the chunk to S3 ${err.message}`
                  );
                  reject(err);
                });
            }
          });

          readStream.on("end", () => {
            resolve();
            console.info("End of the stream");
          });

          readStream.on("close", () => {
            console.info("Close stream");
            if (chunkAccumulator) {
              const chunkMB = chunkAccumulator.length / 1024 / 1024;

              // upload the last chunk
              const params = {
                Bucket: config.S3_BUCKET_NAME,
                Key: `base64/${filename}.base64`,
                PartNumber: partNumber,
                UploadId: uploadId,
                Body: chunkAccumulator,
                ContentLength: chunkAccumulator.length,
              };

              s3.uploadPart(params)
                .promise()
                .then((result) => {
                  console.info(
                    `Last Data uploaded. Entity tag: ${result.ETag} Part: ${params.PartNumber} Size: ${chunkMB}`
                  );
                  multipartMap.Parts.push({
                    ETag: result.ETag,
                    PartNumber: params.PartNumber,
                  });
                  chunkAccumulator = null;
                  resolve(multipartMap);
                })
                .catch((err) => {
                  console.error(
                    `error uploading the last csv chunk to S3 ${err.message}`
                  );
                  reject(err);
                });
            }
          });
        });
      });

      const multipartMap = await uploadPartsPromise;

      console.info(
        `All parts have been upload. Let's complete the multipart upload. Parts: ${multipartMap.Parts.length} `
      );

      // gather all parts' tags and complete the upload
      try {
        const params = {
          Bucket: config.S3_BUCKET_NAME,
          Key: `base64/${filename}.base64`,
          MultipartUpload: multipartMap,
          UploadId: uploadId,
        };
        const result = await s3.completeMultipartUpload(params).promise();
        console.info(
          `Upload multipart completed. Location: ${result.Location} Entity tag: ${result.ETag}`
        );
        const returnUrl = `https://${config.S3_BUCKET_NAME}.s3.us-east-2.amazonaws.com/base64/${filename}.base64`;
        return {
          fileName: `${filename}.base64`,
          location: returnUrl,
        };
      } catch (e) {
        throw new Error(`Error completing S3 multipart. ${e.message}`);
      }
      records = [];
    } catch (e) {
      console.log(e);
      console.log("download error", e);
      return {
        error: e,
      };
    }
    //   if (isRead === true) {
    //     try {
    //       const uploadParams = {
    //         Bucket: config.S3_BUCKET_NAME,
    //         Key: `base64/${filename}.base64`,
    //         Body: fileBase64,
    //         ContentType: "text/plain; charset=base64",
    //       };
    //       await s3.putObject(uploadParams).promise();
    //       console.log(
    //         `${file} is converted to Base64 and has been uploaded to ${config.S3_BUCKET_NAME}`
    //       );
    //       const returnUrl = `https://${config.S3_BUCKET_NAME}.s3.us-east-2.amazonaws.com/base64/${filename}.base64`;
    //       return {
    //         fileName: `${filename}.base64`,
    //         location: returnUrl,
    //         base64: fileBase64,
    //       };
    //     } catch (e) {
    //       console.log(e);
    //       console.log("upload error", e);
    //       return {
    //         error: e,
    //       };
    //     }
    //   }
    // } else {
    //   console.error("Please give valid fileName to convert the File");
    //   return {
    //     error: `Please give valid fileName to convert the File`,
    //   };
  }
};

module.exports = base64MultiPart;
