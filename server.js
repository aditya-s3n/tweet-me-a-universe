require('dotenv').config(); //start reading .env files

//node modules
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { TwitterApi } = require('twitter-api-v2');

/**************************** NASA API Functions ****************************/
//get NASA API Key
const apiKeyNasa = process.env.NASA_API_KEY;

//get NASA APOD data
async function getAPOD() {
    const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${apiKeyNasa}`) //API URI for APOD NASA API
    
    const data = await response.json() //make data readable
        
    return data; //send promise of APOD data
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

    const response = await fetch(apodImageURL);
    const imageData = await response.blob();
    const localImgURL = URL.createObjectURL(imageData);
    
    // // First, post all your images to Twitter
    // const mediaIds = await Promise.all([
    //     // file path
    //     client.v1.uploadMedia(apodImageURL),
    //     // from a buffer, for example obtained with an image modifier package
    //     //client.v1.uploadMedia(Buffer.from(rotatedImage), { type: 'png' }),
    // ]);
    // console.log(mediaIds);

    //await client.v1.tweet(tweetText, { media_ids: mediaIds });
}


/**************************** RUN SERVER ****************************/
let data = getAPOD();
data.then(data => postAPODTweet(data));