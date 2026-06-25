const UserService = require('../Services/UserService');

const handleGetAllUser = async (req, res) => {
  try{
    const result = await UserService.getAllUser();
    return res.status(200).json({
      message: 'Get all user successful',
      users: result,
    });
  }
  catch(err){
    return res.status(500).json({ error : 'Server error'});
  }
}

handleGetUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserService.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({ user });
  }
  catch(err){
    return res.status(500).json({ error : 'Server error'});
  }
}

module.exports = { handleGetAllUser, handleGetUserById };
