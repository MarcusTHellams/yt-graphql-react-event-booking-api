const graphql = require('graphql');
const User = require('./models/user');
const Event = require('./models/event');
const bcrypt = require('bcryptjs');

const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLInputObjectType,
    GraphQLSchema,
    GraphQLList,
    GraphQLFloat,
    GraphQLNonNull,
    GraphQLID
} = graphql;

const EventInputType = new GraphQLInputObjectType({
    name: 'EventInput',
    description: 'Input event payload',
    fields: () => ({
        title: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: new GraphQLNonNull(GraphQLString) },
        price: { type: new GraphQLNonNull(GraphQLFloat) },
        date: { type: new GraphQLNonNull(GraphQLString) },
    })
});

const UserInputType = new GraphQLInputObjectType({
    name: 'UserInput',
    description: 'Input user payload',
    fields: () => ({
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) }
    })
});


const EventType = new GraphQLObjectType({
    name: 'Event',
    fields: () => ({
        _id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: new GraphQLNonNull(GraphQLString) },
        price: { type: new GraphQLNonNull(GraphQLFloat) },
        date: { type: new GraphQLNonNull(GraphQLString) },
        creator: {
            type: new GraphQLNonNull(UserType),
            resolve(parentValue) {
                return User.findById(parentValue.creator)
                    .then(user => {
                        if (!user) {
                            throw new Error(`User with id ${creator} not found`);
                        }
                        return {
                            ...user._doc,
                            password: null
                        }
                    })
                    .catch(e => {
                        console.log(e);
                        throw e;
                    });
            }
        }
    })
});


const UserType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
        _id: { type: new GraphQLNonNull(GraphQLID) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: GraphQLString },
        createdEvents: {
            type: new GraphQLNonNull(new GraphQLList(EventType)),
            resolve(parentValue) {
                return getEvents(parentValue.createdEvents);
            }
        }
    })
});

function getEvents(eventIds = null) {

    return (eventIds ? Event.find({ _id: { $in: eventIds } }) : Event.find()).then(events => {
        return events.map(event => {
            return {
                ...event._doc,
                date: new Date(event._doc.date).toISOString()
            };
        });
    })
        .catch(e => {
            console.log(e);
            throw e;
        });
}


const RootQuery = new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
        events: {
            type: new GraphQLList(EventType),
            resolve(parentValue, args) {
                return getEvents();
            }
        },
        users: {
            type: new GraphQLList(UserType),
            resolve(parentValue, args) {
                return User.find()
                    .then(users => {
                        return users.map(user => {
                            return {
                                ...user._doc,
                                password: null
                            };
                        });
                    })
                    .catch(e => {
                        console.log(e);
                        throw e;
                    });
            }
        }
    }
});


const mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        createEvent: {
            type: EventType,
            args: {
                eventInput: {
                    type: new GraphQLNonNull(EventInputType)
                }
            },
            resolve(parentValue, { eventInput: { title, description, price, date } }) {
                const event = new Event({
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
            }
        },
        createUser: {
            type: UserType,
            args: {
                userInput: {
                    type: UserInputType
                }
            },
            async resolve(parentValue, args) {
                const { userInput: { email, password } } = args;
                let user;
                try {
                    user = await User.findOne({ email });

                } catch (e) {
                    throw e;
                }
                if (user) {
                    throw new Error('User Exists Already.')
                }
                const hashedPassword = await bcrypt.hash(password, 12);
                user = new User({
                    email,
                    password: hashedPassword
                });

                try {
                    await user.save();
                    return Promise.resolve({...user._doc, password: null});
                } catch (e) {
                    throw e
                };

            }
        }
    }
});


module.exports = new GraphQLSchema({
    mutation,
    query: RootQuery
});