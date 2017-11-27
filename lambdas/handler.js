'use strict';

const AWS = require('aws-sdk');
const fileType = require('file-type');

const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const pg = require("pg");
const fetch = require('request-promised').get;
const post = require('request-promised').post;


module.exports.hello = (event, context, callback) => {
  callback(null, { Message: 'Hello World!', Info:{
    env: process.env
  }});
};

module.exports.goodNight = (event, context, callback) => {
  callback(null, { Message: 'Good Night World!'});
};

module.exports.upload = (event, context, callback) => {
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

module.exports.listFromS3 = (event, context, callback) => {

    context.callbackWaitsForEmptyEventLoop = false;

    const params = {
      Bucket: process.env.BUCKET,
      MaxKeys: 10
    };
   s3.listObjects(params, function(err, data) {
     if (err) callback(err, null); // an error occurred
     else     callback(null, data);           // successful response
   });

};

module.exports.store = (event, context, callback) => {
  const connectionString = process.env.PG_CONNECTION_STRING;
  const tableName = process.env.PG_TABLE;
  const insert_query = `INSERT INTO ${tableName}(Timestamp, Username, Description, FileName, StaticLink) values($1, $2, $3, $4, $5)`;
  const timestamp = Math.floor(new Date() / 1000);
  //console.log(JSON.stringify(event, null, 2));

  context.callbackWaitsForEmptyEventLoop = false;

  const client = new pg.Client(connectionString);
  client.connect();

  const file = event.filename;
  const url = `${process.env.BUCKET_URL}/${file}`;

  const query = client.query(insert_query,[timestamp, event.username, event.description, file, url], (err, results) => {
    if(err) callback(new Error([err.statusCode], res.status(500).json({success: false, data: err} )));

    callback(null, {
      statusCode: '200',
      headers: {'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({"results": results})
    });

    client.end();

  });

};

module.exports.write = (event, context, callback) => {
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
