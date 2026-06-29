const users = require("../data/userData");
const userModel = require("../model/Users");
class UserRepository {
  constructor() {}

  getAllUsers() {
    return users;
  }
  
  addUser(usersData) {
    console.log('Adding user:', usersData);
    const newUserId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const newUser = new userModel(newUserId, usersData.username,usersData.password,usersData.email);
    users.push(newUser);
  }
}

module.exports = UserRepository;