require('dotenv').config(); //start reading .env files

//node modules
const express = require("express");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


/**************************** NASA API Functions ****************************/
//get NASA API Key
const ApiKeyNasa = process.env.NASA_API_KEY;

//get NASA APOD data
async function getAPOD() {
    const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${ApiKeyNasa}`) //API URI for APOD NASA API
    
    const data = await response.json() //make data readable
        
    return data; //send promise of APOD data
}


/**************************** Twitter API Functions ****************************/


/**************************** RUN SERVER ****************************/
let data = getAPOD();
data.then(data => console.log(data))