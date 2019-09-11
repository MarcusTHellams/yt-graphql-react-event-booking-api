const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const EventModel = require('./models/event')

const app = express();


app.use(bodyParser.json());

app.use('/graphql', graphqlHttp({
    schema: buildSchema(`
        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        type RootQuery{
            events: [Event!]!
        }
        type RootMutation {
            createEvent(eventInput:EventInput): Event
        }
        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
        events: () => {
            return EventModel.find().then(events => {
                return events.map(event => ({ ...event._doc, date: new Date(event._doc.date).toISOString() }));
            })
                .catch(e => {
                    console.log(e)
                    throw e;
                });
        },
        createEvent: ({ eventInput: { title, description, price, date } }) => {
            const event = new EventModel({
                title,
                description,
                price,
                date: new Date(date)
            });
            return event.save()
                .then(result => {
                    return { ...result._doc, date: new Date(event._doc.date).toISOString()  };
                })
                .catch(e => {
                    console.log(e);
                    throw e;
                });

        }
    },
    graphiql: true
}));

mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@marcus-test-tkbnu.mongodb.net/test?retryWrites=true&w=majority`)
    .then(() => {
        app.listen(3000);

    })
    .catch((e) => { console.log(e); });
