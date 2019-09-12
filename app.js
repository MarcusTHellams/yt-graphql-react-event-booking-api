const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const EventModel = require('./models/event');
const User = require('./models/user');
const bcrypt = require('bcryptjs');
const BetterScheme =  require('./schema');

const app = express();


app.use(bodyParser.json());

app.use('/graphql', graphqlHttp({
    schema:BetterScheme,
    graphiql: true
}));

mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@marcus-test-tkbnu.mongodb.net/test?retryWrites=true&w=majority`)
    .then(() => {
        app.listen(3000);

    })
    .catch((e) => { console.log(e); });
