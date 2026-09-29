const { UserStore } = require("../../config/aerospikeStore");

const User = {
    create: (data) => UserStore.create(data),
    findOne: (query) => UserStore.findOne(query),
    findById: (id) => UserStore.findById(id),
    findByIdAndDelete: (id) => UserStore.findByIdAndDelete(id)
};

module.exports = {
    User
};
