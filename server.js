/*
modules initialization
*/
require('dotenv').config()
const express = require('express');
var bodyParser = require('body-parser');
const axios = require('axios').default;
var SpotifyWebApi = require('spotify-web-api-node');
var session = require('express-session');
const path = require('path');

var loggedin = false;
var spotifydata = [];
var sess;
var completed = false;

var access_token1 = "";
const port = process.env.PORT || 5500; //allow environment to set their own port number or we assign it

//what user data we want to read
const scopes = [
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'user-library-read',
  'user-top-read',
  'user-read-recently-played',
];

// client credentials 
var spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: 'https://lrfy-beta.herokuapp.com/callback'
  //redirectUri: 'http://localhost:5500/callback'
});

//starting express module
var app = express();
app.use(express.static('public'));
app.use(session({
  secret: 'xQc0W',
  resave: false,
  cookie: {maxAge: 900000},
  saveUninitialized: false,
}));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());



//start listening to assigned port on line 9
app.listen(port, () =>
  console.log(
    `HTTP Server up. Now go to http://localhost: ${port} on ur browser`
  )
);

var generateRandomString = function (length) {
	var text = '';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (var i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
};

/*
function validateCookie(req,res,next){

  const { cookies } = req;
  console.log(`masuk validateCookie()`);
  if('session_id' in cookies){
    console.log(`${JSON.stringify(cookies)} existed`); 
    //if(cookies.session_id === '12345') next();
    next();
    //return true;
  }
  else{
    console.log(`sorry, cookies not existed`); 
    res.redirect('/');
    //return false;
  }


}
*/




//if the user click the button , it will go to /login , and process with spotify login
app.get('/login',  (req, res) => {

  req.session.authenticated = false;
  req.session.completed = false;
  console.log("");
  console.log("masuk /login");
  console.log("req.session.auth in /login: " +req.session.authenticated);
  console.log("req.session.completed in /login: " +req.session.completed);
  console.log("current url: "+ req.originalUrl);
  console.log("accesstoken: "+spotifyApi.getAccessToken());

  console.log("");
  console.log("session.id: "+req.session.id);
  console.log("sessionID: "+ req.sessionID);
  console.log("");

  if(spotifyApi.getAccessToken()==null){
  console.log("no acces token , redirect to login page");
  res.redirect(spotifyApi.createAuthorizeURL(scopes)); //goto spotify login page
  }
  else{
    req.session = null;
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
  }
  
});

app.get('/callback', (req, res) => { //once it has been logged in, go to /callback
  console.log("");
  console.log("masuk /callback");
  console.log("current url: "+ req.originalUrl);
  const error = req.query.error;
  const code = req.query.code;
  const state = req.query.state;

  var id = generateRandomString(16);
  //console.log("\nsession_id: "+id);
  //res.cookie(`session_id`,`${id}`, {httpOnly:true, maxAge:900000,  sameSite: 'lax'}); //cookies set to 15 minutes

  req.session.authenticated = true;
  console.log(req.session.authenticated);
 


  if (error) {
    console.error('Callback Error:', error);
    res.session.send(`Callback Error: ${error}`);
    return;
  }

  spotifyApi
    .authorizationCodeGrant(code)
    .then(data => {


      const access_token = data.body['access_token']; //get access token to use for another API call
      const refresh_token = data.body['refresh_token'];
      const expires_in = data.body['expires_in'];

      //access_token1 = data.body['access_token'];

      spotifyApi.setAccessToken(access_token); //set access token
      spotifyApi.setRefreshToken(refresh_token);

      console.log('access_token:', access_token);
      console.log('refresh_token:', refresh_token);

      console.log(
        `Sucessfully retreived access token. Expires in ${expires_in} s.`
      );
       loggedin = true;
      console.log("\n");
      if (loggedin == true) {
        console.log("loggedin = true ")
        res.redirect("/quiz"); //change page to 'quiz'
      } else {
        console.log("loggedin = false ")
        res.redirect("/");
      }
      setInterval(async () => {
        const data = await spotifyApi.refreshAccessToken();
        const access_token = data.body['access_token'];

        console.log('The access token has been refreshed!');
        console.log('access_token:', access_token);
        spotifyApi.setAccessToken(access_token);
      }, expires_in / 2 * 1000);
    })
    .catch(error => {
      console.error('Error getting Tokens:', error);
      res.send(`Error getting Tokens: ${error}`);
    });


});



//prevent user to implicitly enter quiz without log in
app.get('/quiz/*', function  (req, res)  {
  console.log("");
  console.log("masuk /quiz");
  console.log("current url: "+ req.originalUrl);
  console.log("req.session.authenticated in /quiz:  " +req.session.authenticated);
  console.log("req.session.completed in /quiz:  " +req.session.completed);

  if(req.session.authenticated ==true && (req.session.completed == false || req.session.completed == undefined)){
    console.log("masuk 1");
    return res.sendFile(__dirname + "/public/quiz/quiz.html");
  } 
  else{
    console.log("3");
    return res.redirect('/error');
  }
});


app.get('/result', function (req, res) {
  console.log("");
  console.log("masuk /result")
  console.log("current url: "+ req.originalUrl);
  console.log("req.session.authenticated in /result:  " +req.session.authenticated);
  console.log("req.session.completed in /result:  " +req.session.completed);
  res.sendFile(__dirname + "/public/result/result.html");
  req.session.authenticated = false;
  req.session.completed = true;
  req.session.destroy();

  /*
  const { cookies } = req;
  console.log("masuk validateCookie()");
  if('session_id' in cookies){
    console.log(`${JSON.stringify(cookies)} existed`); 
    res.clearCookie('session_id',`${cookies}`);
    req.session = null;
    console.log("access token1: "+spotifyApi.getAccessToken());
    spotifyApi.resetAccessToken(spotifyApi.getAccessToken());
    console.log("access token2: "+spotifyApi.getAccessToken());
    console.log("cookies destroyed");
  }
*/
  
  
});

app.get('/error', function (req,res) {
  console.log("masuk /error");
  console.log("current url: "+ req.originalUrl);
 res.sendFile(__dirname + "/public/Error/error.html");
});



  //kalau selain dri allowable route




app.get('/secret', function (req, res) {
  console.log("");
  console.log("masuk /secret");
  console.log("current url: "+ req.originalUrl);
  console.log("req.session.authenticated in /secret:  " +req.session.authenticated);
  console.log("req.session.completed in /secret:  " +req.session.completed);
  console.log("loggedin in /secret:  " +loggedin);

  var getdata = false;
  var userid = "";
  var imgurl = "";
  var topalbum = [];

  function timeout() {
    setTimeout(function () {
      console.log("ready to send data to client");
      if (getdata == true) {
        senddata();
        //console.log("data saved on spotifydata:   " + spotifydata);
       // res.send(spotifydata);

        return;
      }
      else{
        return;
      }
      timeout();
    }, 1000);
  }

  /*
  if( req.session.completed == undefined && req.session.authenticated == undefined && loggedin==true ){
    console.log("current url1: "+ req.originalUrl);
    return res.redirect('/quiz');
    console.log("current url2: "+ req.originalUrl);
  }
*/
    if (loggedin == true && req.session.authenticated ==true && (req.session.completed == false || req.session.completed == undefined)) {

    // Get the authenticated user
    spotifyApi.getMe()
      .then(function (data) {

       // console.log('Some information about the authenticated user', data.body);
        userid = data.body.id;
        imgurl = data.body.images[0].url;
        //console.log(userid);
       // console.log(imgurl);

      }, function (err) {
        console.log('Something went wrong!', err);
      })/*.then(function(){

        //get user playlist
        spotifyApi.getUserPlaylists(userid)
          .then(function (data) {
            console.log('Retrieved playlists', data.body);
          }, function (err) {
            console.log('Something went wrong!', err);
          });

      })*/.then(function(){
          //get user saved tracks
          spotifyApi.getMyTopTracks({
            limit : 20,
            offset: 0,
            time_range: 'short_term'
          })
          .then(function(data) {

            for(var i=0; i<15; i++){
              var albumurl = data.body.items[i].album.images[0].url;

              if(topalbum.includes(albumurl,0)==true){
              }
              else{
                topalbum.push(albumurl);
              }

            }
           // console.log(data.body.items[0].album.name);
           // topalbum.push(JSON.stringify(data.body.items[0].album.images[0].url))
           // checkduplicate();

           // console.log(JSON.stringify(data.body));
           // spotifydata.push(data.body.items[1]);
            console.log('Done!');
          }, function(err) {
            console.log('Something went wrong!', err);
          });

      });

      getdata=true;
      timeout();

  } 
  else {
    res.redirect("/error");
  }



function senddata(){
  console.log("data sent!");
  var data = {
    "MM_API": `${process.env.API_KEY}`,
    "USER": {
          "displayname": `${userid}`,
          "image": `${imgurl}`,
          "ALBUMART": topalbum
      }
    
  };


  console.log(data);
  res.send(data);
}



});

app.get('/*', function (req, res) { 
  console.log(req.url);
  console.log("masuk /*");
    res.sendFile(__dirname + "/public/Error/error.html");
});

//DELETE LATER
app.post('/endpoint', function (req, res) {
  var obj = {};
  console.log('body: ' + JSON.stringify(req.body));
});