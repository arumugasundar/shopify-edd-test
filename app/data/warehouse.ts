import prisma from '~/db.server';

export const getWarehouseByUserAndOrigin = async (pincode: string , eshipz_user_id: string) => {
  try{
      const warehouse = await prisma.warehouses.findFirst({
        where: { pincode, eshipz_user_id },
        select: { non_operational_dates: true, closing_time: true }
      })
      return warehouse;
  } catch(error: any) {
      console.log('error :', error.toString());
      return null;
  }
}
