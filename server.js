require('dotenv').config(); //start reading .env files
//node modules
const { TwitterApi } = require('twitter-api-v2');
const mongoose = require('mongoose');
const fs = require("fs");
const axios = require('axios').default;


/**************************** NASA API Functions ****************************/
//get NASA API Key
const apiKeyNasa = process.env.NASA_API_KEY;

//get NASA APOD data
async function getAPOD() {
    const apodURL = `https://api.nasa.gov/planetary/apod?api_key=${apiKeyNasa}`;

    //make https request
    const response = await axios.get(apodURL)
    
    //send data back 
    return response.data;
}


/**************************** Twitter API Functions ****************************/
// create client with OAuth1 credientials
const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_KEY_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_TOKEN_SECRET,
});

//send APOD Image + Tweet
async function postAPODTweet(apodData) {
    const apodImageTitle = apodData.title; //get the title of the image
    const apodImageURL = apodData.hdurl; //get the url of the image, in HD quality
    
    //create the twitter text template
    const tweetText = `\
Tweet me a Universe --Test 2.0

${apodImageTitle}`;

    //get image and save it
    const localImageURL = "./apodImage.jpg";
    // GET request for remote image in node.js using Axios
    const imageData = await axios({
        method: 'get',
        url: apodImageURL,
        responseType: 'stream'
    })
    const imageUpload = imageData.data.pipe(fs.createWriteStream(localImageURL)); //make image in local machine

    //when finish downloading image
    imageUpload.on("finish", async () => {
        const imageUploadId = await client.v1.uploadMedia(localImageURL); //attach image to tweet

        //tweet
        await client.v1.tweet(tweetText, { media_ids: imageUploadId }); //make post request to Twitter to post tweet

        //delete image
        fs.rm(localImageURL, (err) => {
            //check for error
            if (err) {
                console.log(err)
            }
            //no error
            else {
                console.log("Deleted File Successfully");
            }
        });
    });
}


/**************************** MongoDB Database ****************************/



/**************************** RUN SERVER ****************************/
let data = getAPOD();
data.then(data => postAPODTweet(data));