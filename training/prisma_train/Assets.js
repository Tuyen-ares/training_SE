const prisma = require('./connect').default;

const findAssets = async()=>{
  const getAssets = await prisma.assets.findMany();
  console.log(getAssets);
}
findAssets()