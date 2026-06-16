const prisma = require('../prisma');

const getAllUser = async() =>{
  const users = await prisma.users.findMany();
  return users;
};

const getUserById = async (id) => {
  const user = await prisma.users.findUnique({
    where: { id },
  });
  return user;
};

const createUser = async({departmentId, roleId, name, password, email, phone}) =>{
  const user = await prisma.users.create({
    data :{
      department_id: departmentId,
      role_id: roleId,
      name: name,
      password: password,
      email : email,
      phone : phone
    }
  })
  return user;
};

const updateUser = async (id, {departmentId, roleId, name, password, email, phone}) =>{
  const user = await prisma.users.update({
    where: { id },
    data :{
      department_id: departmentId,
      role_id: roleId,
      name: name,
      password: password,
      email : email,
      phone : phone
    }
  });
  return user;

}
 const deleteUser = async (id) => {
    await prisma.users.delete({
      where: { id },
    });
  };

module.exports = { getAllUser, getUserById, createUser, updateUser, deleteUser };