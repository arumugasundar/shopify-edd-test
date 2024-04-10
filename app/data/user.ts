import prisma from '~/db.server';

export const getUserByStoreUrl = async (store_domain: string) => {
  try{
      const user = await prisma.users.findUnique({ where: { store_domain }});
      return user;
  } catch(error: any) {
      console.log('error :', error.toString());
      return null;
  }
}
