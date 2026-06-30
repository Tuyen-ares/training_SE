
const userModel = require("../model/Users");
class UserRepository {
  constructor(usersData) {
    this.users = usersData;
  }

  getAllUsers() {
    return this.users;
  }
  
  addUser(data) {
    console.log('Adding user:', this.users);
    const newUserId = this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1;
    const newUser = new userModel(newUserId, data.username, data.password, data.email);
    this.users.push(newUser);
    return newUser;
  }
}

module.exports = UserRepository;