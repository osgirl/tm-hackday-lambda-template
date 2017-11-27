'use strict';

const AWS = require('aws-sdk');
const fileType = require('file-type');
const ImageAnalyser = require('./lib/rekognition');

const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const pg = require("pg");
const fetch = require('request-promised').get;
const post = require('request-promised').post;
const dateTime = require('date-time');


module.exports.hello = (event, context, callback) => {
  callback(null, { Message: 'Hello World!', Info:{
    env: process.env
  }});
};

module.exports.upload = (event, context, callback) => {

  // stops lingering on event loop
  context.callbackWaitsForEmptyEventLoop = false;

  // const username = context.authorizer.claims.preferred_username;
  const username = "manual_user";

  const title = event.body.title ? event.body.title.replace(/\W/g,'') : 'uploaded_image';

  //get the image data from upload
  const body = event.body;

  const fileBuffer = new Buffer(body['image'].replace(/^data:image\/\w+;base64,/, ""), 'base64');
  const fileMime = fileType(fileBuffer);
  const mime = fileMime.mime;
  const ext = fileMime.ext;

  //validate image is on right type
  if (fileBuffer.length < 500000 ) {

    // upload it to s3 with unix timestamp as a file name
    const timestamp = Math.floor(new Date() / 1000);
    const fileName = `${title}-${timestamp}.${ext}`;

    const bucket = process.env.BUCKET;
    const bucket_url = process.env.BUCKET_URL;
    const connectionString = process.env.PG_CONNECTION_STRING;
    const tableName = process.env.PG_TABLE;
    const staticurl = `${bucket_url}/${fileName}`;

    const params = {
        Body: fileBuffer,
        Key: fileName,
        Bucket: bucket,
        ContentEncoding: 'base64',
        ContentType: mime,
        ACL: 'public-read',
        Metadata:{
          ContentType: mime,
          "user": username,
          "description":  event.body.description
        }
    };

    s3.putObject(params, (err, data) => {

        if (err) callback(new Error([err.statusCode], [err.message]));
        callback(null, {
          statusCode: '200',
          headers: {'Access-Control-Allow-Origin': '*'},
          body: JSON.stringify({"message": "Successfully uploaded to S3", "filename":fileName})
      });

    });
  } else {
      callback(null, {
          statusCode: '402',
          headers: {'Access-Control-Allow-Origin': '*'},
          body: JSON.stringify({"message": "Not a valid file type or file too big."})
      });
  }
};

module.exports.list = (event, context, callback) => {

  context.callbackWaitsForEmptyEventLoop = false;

  const listQuery = `SELECT * FROM ${process.env.PG_TABLE} ORDER BY timestamp DESC LIMIT 20;`;
  const client = new pg.Client(process.env.PG_CONNECTION_STRING);
  client.connect();
  const query = client.query(listQuery, (err, results) => {
     client.end();

    callback(null, {
      statusCode: '200',
      headers: {'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({"results": results})
    });

  });

}


module.exports.store = (event, context, callback) => {
  const connectionString = process.env.PG_CONNECTION_STRING;
  const tableName = process.env.PG_TABLE;
  const insert_query = `INSERT INTO ${tableName}(Timestamp, Username, Description, FileName, StaticLink) values($1, $2, $3, $4, $5)`;
  const timestamp = Math.floor(new Date() / 1000);
  console.log(JSON.stringify(event, null, 2));
  console.log(dateTime());

  context.callbackWaitsForEmptyEventLoop = false;

  const client = new pg.Client(connectionString);
  client.connect();

  const file = event.body.filename;
  const url = `${process.env.BUCKET_URL}/${file}`;

  const query = client.query(insert_query,[dateTime(), event.body.username, event.body.description, file, url], (err, results) => {
    client.end();
    if(err) callback( null, {
      statusCode: '500',
      headers: {'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({"message": err})
    });

    callback(null, {
      statusCode: '200',
      headers: {'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({
        "url": url,
        "description": event.body.description
      })
    });
  });

};
<<<<<<< HEAD

module.exports.analyze = (event, context, callback) => {
  const data = event.body;

  const s3Config = {
    bucket: data.bucket,
    imageName: data.key,
  };

  // callback(null, {
  //   statusCode: '200',
  //   headers: {'Access-Control-Allow-Origin': '*'},
  //   body: JSON.stringify({"results": s3Config})
  // });

  return ImageAnalyser
    .getImageLabels(s3Config)
    .then((labels) => {
      const response = {
        statusCode: 200,
        headers: {'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({ Labels: labels }),
      };
      callback(null, response);
    })
    .catch((error) => {
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
        body: error.message || 'Internal server error',
      });
    });


};
=======
>>>>>>> 41940d85aa42b7285319cc189625f6fb8d3eb72c
