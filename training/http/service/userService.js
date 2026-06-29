
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  getAllUsers() {
    return this.userRepository.getAllUsers();
  }
  addUser(UserData){
    //console.log('UserData:', UserData);
    if(UserData.username.length < 3){
      throw new Error('ten ngan qua');
    }
    return this.userRepository.addUser(UserData);
  } 
}

module.exports = UserService;