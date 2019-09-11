const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const EventModel = require('./models/event');
const User = require('./models/user');
const bcrypt = require('bcryptjs');

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
            creator: User!
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        type User {
            _id: ID!
            email: String!
            password: String
            createdEvents: [Event!]
        }

        input UserInput {
            email: String!
            password: String!
        }

        type RootQuery{
            events: [Event!]!
        }
        type RootMutation {
            createEvent(eventInput:EventInput): Event
            createUser(userInput:UserInput): User
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
                date: new Date(date),
                creator: '5d794249eaf2e159242312c9'
            });
            let createdEvent;
            return event.save()
                .then(result => {
                    createdEvent = { ...result._doc, date: new Date(event._doc.date).toISOString() };
                    return User.findById('5d794249eaf2e159242312c9');
                })
                .then(user => {
                    if (!user) {
                        throw new Error('User Does Not Exsist.')
                    }
                    user.createdEvents.push(event);
                    return user.save();
                })
                .then(() => {
                    return createdEvent;
                })
                .catch(e => {
                    console.log(e);
                    throw e;
                });

        },
        createUser: (args) => {
            const { userInput: { email, password } } = args;
            return User.findOne({ email })
                .then(user => {
                    if (user) {
                        throw new Error('User Exists Already.')
                    }
                    return bcrypt.hash(password, 12)
                })
                .then(hashedPassword => {
                    const user = new User({
                        email,
                        password: hashedPassword
                    });
                    return user.save()
                        .then(user => {
                            return { ...user._doc, password: null }
                        })
                        .catch(e => {
                            console.log(e);
                            throw e;
                        })
                })
                .catch(e => {
                    throw e
                })
        },
    },
    graphiql: true
}));

mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@marcus-test-tkbnu.mongodb.net/test?retryWrites=true&w=majority`)
    .then(() => {
        app.listen(3000);

    })
    .catch((e) => { console.log(e); });
