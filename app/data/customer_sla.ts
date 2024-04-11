import prisma from '~/db.server';

export const getCustomerSla = async (source_pincode: string, destination_pincode: string, eshipz_user_id: string) => {
  try{
    const warehouses = await prisma.customer_sla.findMany({
      where: { source_pincode, destination_pincode, eshipz_user_id },
      select: { sla: true, is_cod: true },
      orderBy: { sla: 'asc' }
    })
    return warehouses;
  } catch(error: any) {
      console.log('error :', error.toString());
      return null;
  }
}
