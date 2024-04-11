import prisma from "~/db.server";

export const getLocationPriorityByUserAndDestination = async (destination_pincode: string, eshipz_user_id: string) => {
  try{
    const location_priority = await prisma.location_priority.findFirst({
      where: { eshipz_user_id, delivery_pincodes: { has : destination_pincode } },
      select: { pickup_location_names: true, mother_warehouse: true },
      take: 1
    })
    return location_priority;
} catch(error: any) {
    console.log('error :', error.toString());
    return null;
}
}
