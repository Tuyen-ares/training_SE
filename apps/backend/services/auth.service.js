const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const salt = bcrypt.genSaltSync(10);


const hashUserPassword = async (Password) =>{
  const hashPassword = await bcrypt.hash(Password, salt);
  return hashPassword;
}


const register = async ({departmentId, roleId, name, password, email, phone}) =>{
  const existEmail = await prisma.users.findFirst({
    where: { email }
  })
  if(existEmail){ 
   throw new Error('EMAIL_IN_USE');
  }
  const hashPassword = await hashUserPassword(password);
  const user = await prisma.users.create({
    data:{
      department_id: departmentId,
      role_id: roleId,
      name: name,
      password: hashPassword,
      email : email,
      phone : phone
    }
  })
  return user;
}

const login = async ({email, password} ) => {
 const user = await prisma.users.findFirst({
  where: { email }
 });
 if(!user){ throw new Error('INVALID_EMAIL'); }

 const isPasswordValidate  = await bcrypt.compare(password, user.password);
 if(!isPasswordValidate){ throw new Error('INVALID_PASSWORD'); }

 const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    roleId: user.role_id,
    departmentId: user.department_id
 };

 const token = jwt.sign(
  { 
    payload
  },
  process.env.JWT_SECRET,
  { expiresIn: '30s'
  }
 )
 return { token ,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.role_id
  }
 };
};

module.exports = { register, login };
