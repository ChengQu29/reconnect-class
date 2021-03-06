// server code
const express = require('express');
const Datastore = require('nedb');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)); //refer to npm documentation
require('dotenv').config();
//console log it to check api_key is in the environment variables
console.log(process.env);

const path = require('path'); //path module is a node.js core module
const http = require('http'); //socket io needs http
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
//app.use(express.static(path.join(__dirname, 'public')));

const botName = 'Bot ';

// Run when client connects
io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);

        socket.join(user.room);

        // Welcome current user
        socket.emit('message', formatMessage(botName, 'Welcome to ReConnect!'));

        // Broadcast when a user connects
        socket.broadcast
        .to(user.room)
        .emit(
            'message',
            formatMessage(botName, `${user.username} has joined the chat`)
        );

        // Send users and room info
        io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
        });
    });

    // Listen for chatMessage
    socket.on('chatMessage', msg => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });

    // Runs when client disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit(
                'message',
                formatMessage(botName, `${user.username} has left the chat`)
            );

            // Send users and room info
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });
});

//start server and listening requests at port 3000
//app.listen(3000, () => console.log('listening at 3000'));
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Starting server at ${port}`);
});
//host static files
app.use(express.static('public')); 

//const path = require('path');

//built in Express middleware to parse incoming request with json payloads
app.use(express.json({limit: '1mb'}));  // documentation: http://expressjs.com/en/api.html

//create database on server
const database = new Datastore('database.db');
database.loadDatabase();
//database.insert({name: 'James', status:'success'});

//route methods
// set up endpoint for this particular route i.e. where I want to receive the post : /api , could call it anything for example /chengwen
// the second argument is also called a call-back, which is just a function as argument 
app.post('/api', (request, response) => {
    console.log('I got a request');
    //console.log(request); //request contains all the information the client is sending to the server
    //console.log(request.body);
    //after this is setup, move over to client/browser code, to set up the fetch

    const data = request.body;
    const timestamp = Date.now();
    data.timestamp = timestamp;
    //record in the database
    database.insert(data);
    
    // complete the request by sending a response back to client
    response.json({
        status: 'success',
        timestamp: timestamp,
        latitude: data.lat,
        longitude: data.lon,
        mood: data.mood
    });
});

app.get('/api', (request,response) => {
    // consult nedb documentation for the find method
    database.find({}, (err, data) => {
        if (err) {
            response.end();
            return;
        }
        // call find, have the data come back from the database, pass it back to the client
        response.json(data);
        //response.json({test: 123});
    });
});


app.get('/weather/:latlon', async (request, response) => {
    const latlon = request.params.latlon.split(',');
    const lat = latlon[0];
    const lon = latlon[1];
    const api_key = process.env.API_KEY;
    const weather_url = `http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&APPID=${api_key}`;
    // fetch is usually a client side command, for it to work on server side, it must be installed first
    // npm install node-fetch, then add require('node-fetch') at the top
    const fetch_response = await fetch(weather_url);
    const weather_data = await fetch_response.json();
    response.json(weather_data);
});