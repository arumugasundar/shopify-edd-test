import { type ActionFunctionArgs, json } from '@remix-run/node';

import { getSLAPredictions } from '~/data/api';
import { getCustomerSla } from '~/data/customer_sla';
import { getLocationPriorityByUserAndDestination } from '~/data/location_priority';
import { getLocations, getInventoryItemId, getInventoryLevels } from '~/data/shopify';
import { getUserByStoreUrl } from '~/data/user';
import { checkPincodeServiceability, getDelayInDays, getFormattedDate, getMinMaxExpDelDate, getPriorityWiseLocations, getSourcePincode } from '~/data/utils';
import { getWarehouseByUserAndOrigin } from '~/data/warehouse';


export async function action({ request }: ActionFunctionArgs) {

  let url = new URL(request.url);
  let store_url = url.searchParams.get('shop');
  if(!store_url) return json({ success: false, message : `invalid store`});

  let user = await getUserByStoreUrl(store_url);
  if(!user) return json({ success: false, message: `user not found`});

  const { store_domain, is_active, shopify_access_token, eshipz_user_id, plan, sla_compute_mode, slug } = user;
  if(!is_active) return json({ success: false, message : `user account is inactive`});

  let query = await request.json();
  const source_pincode = query?.origin_pincodes?.[0];
  const destination_pincode = query?.destination_pincode;
  const product_variant_id = query?.product_variant_id;

  if(plan === 'basic')
    if(source_pincode && destination_pincode && eshipz_user_id && slug)
      if(sla_compute_mode === 'generic') return getEddBasicAndGeneric(source_pincode, destination_pincode, eshipz_user_id, slug);
      else if(sla_compute_mode === 'custom') return getEddBasicAndCustom(source_pincode, destination_pincode, eshipz_user_id, slug);
      else return json({ success: false, message: `invalid sla compute mode`});
    else return json({ success: false, message: `missing few required attributes`});
  else if (user?.plan === 'intermediate')
    if(destination_pincode && eshipz_user_id && slug && product_variant_id && shopify_access_token && store_domain)
      if(sla_compute_mode === 'generic') return getEddIntermediateAndGeneric(destination_pincode, eshipz_user_id, slug, product_variant_id, shopify_access_token, store_domain);
      else if(sla_compute_mode === 'custom') return getEddIntermediateAndCustom(destination_pincode, eshipz_user_id, slug, product_variant_id, shopify_access_token, store_domain);
      else return json({ success: false, message: `invalid sla compute mode`});
    else return json({ success: false, message: `missing few required attributes`});
  else return json({ success: false, message: `invalid user plan`});

}

const getEddBasicAndGeneric = async (source_pincode: string, destination_pincode: string, eshipz_user_id: string, slug: string[]) => {

  try {

    let pincode_serviceability_response = await checkPincodeServiceability(source_pincode, destination_pincode, eshipz_user_id);
    if(pincode_serviceability_response?.status !== "success") return json({ success: false, message:"This pincode is not in service"});


    let payload = [];
    for(let i=0;i<slug.length;i++) payload.push({ "origin_pincode": `${source_pincode}`, "destination_pincode": `${destination_pincode}`, "slug": slug[i]})
    let predictions = await getSLAPredictions(payload);
    const { minExpDelDate, maxExpDelDate } = getMinMaxExpDelDate(predictions);

    if(predictions && (Object.keys(predictions).length > 0)){
        return json({ min_edd : minExpDelDate?.slice(0,10), max_edd : maxExpDelDate?.slice(0,10), is_cod : false });
    } else {
        return json({ success: false, message: "SLA is not available for this destination"});
    }

  } catch (error) {
      return json({ success: false, message: "SLA is not available for this destination", error: `${error?.toString()}`});
  }

}

const getEddBasicAndCustom = async (source_pincode: string, destination_pincode: string, eshipz_user_id: string, slug: string[]) => {

  try {
    const warehouse = await getWarehouseByUserAndOrigin(source_pincode, eshipz_user_id);
    const delay_in_days = getDelayInDays(warehouse?.closing_time, warehouse?.non_operational_dates);
    const logistics_details = await getCustomerSla(source_pincode, destination_pincode, eshipz_user_id);
    let length = logistics_details?.length;
    if(length && length > 0){

      let pincode_serviceability_response = await checkPincodeServiceability(source_pincode, destination_pincode, eshipz_user_id);
      if(pincode_serviceability_response?.status !== "success") return json({ success: false, message:"This pincode is not in service"});

      let is_cod = pincode_serviceability_response?.data?.cod_delivery;
      is_cod = is_cod ? logistics_details?.length === 1 ? logistics_details[0].is_cod : false : false;
      let result = {
          min_edd : getFormattedDate(logistics_details?.[0].sla ?? 0 + delay_in_days),
          max_edd : getFormattedDate(logistics_details?.[length-1].sla ?? 0 + delay_in_days),
          is_cod: is_cod
      }
      return json(result);

    } else {
      return json({ success: false, message: "SLA is not available for this destination"});
    }
  } catch (error) {
    return json({ success: false, message: "SLA is not available for this destination", error: `${error?.toString()}`});
  }

}

const getEddIntermediateAndGeneric = async (destination_pincode: string, eshipz_user_id: string, slug: string[], product_variant_id: string, shopify_access_token: string, store_domain: string) => {

  try {
    const location_priority = await getLocationPriorityByUserAndDestination(destination_pincode, eshipz_user_id);
    let priority_wise_pickup_location_names = location_priority?.pickup_location_names;

    const locations = await getLocations(shopify_access_token, store_domain);
    if(!locations) return json({ success: false, message: `unable to fetch location information`});

    let pickup_location_ids = locations?.map(item => item.id);
    let pickup_location_names = locations?.map(item => item.name);
    let pickup_location_pincodes = locations?.map(item => item.zip);

    const inventory_item_id = await getInventoryItemId(shopify_access_token, store_domain, product_variant_id)
    if(!inventory_item_id) return json({ success: false, message: `unable to fetch inventory item id`});

    const inventory_levels = await getInventoryLevels(shopify_access_token, store_domain, inventory_item_id, pickup_location_ids);
    if(!inventory_levels) return json({ success: false, message: `unable to fetch inventory levels information`});

    // priority_wise_pickup_location_names?.unshift(location_priority?.mother_warehouse); // probably that priority includes primary warehouse also
    let pickup_locations = await getPriorityWiseLocations(pickup_location_ids, pickup_location_names, pickup_location_pincodes, priority_wise_pickup_location_names);

    let source_pincode = getSourcePincode(inventory_levels, pickup_locations);
    if(!source_pincode) return json({ success: false, message: `no pickup locations are available for this delivery pincode`});

    let pincode_serviceability_response = await checkPincodeServiceability(source_pincode, destination_pincode, eshipz_user_id);
    if(pincode_serviceability_response?.status !== "success") return json({ success: false, message:"This pincode is not in service"});

    let payload = [];
    for(let i=0;i<slug.length;i++) payload.push({ "origin_pincode": `${source_pincode}`, "destination_pincode": `${destination_pincode}`, "slug": slug[i]})
    let predictions = await getSLAPredictions(payload);
    const { minExpDelDate, maxExpDelDate } = getMinMaxExpDelDate(predictions);

    if(predictions && (Object.keys(predictions).length > 0)){
        return json({ min_edd : minExpDelDate?.slice(0,10), max_edd : maxExpDelDate?.slice(0,10), is_cod : false });
    } else {
        return json({ success: false, message: "SLA is not available for this destination"});
    }

  } catch (error) {
    return json({ success: false, message: "SLA is not available for this destination", error: `${error?.toString()}`});
  }

}

const getEddIntermediateAndCustom = async (destination_pincode: string, eshipz_user_id: string, slug: string[], product_variant_id: string, shopify_access_token: string, store_domain: string) => {

  try {
    const location_priority = await getLocationPriorityByUserAndDestination(destination_pincode, eshipz_user_id);
    let priority_wise_pickup_location_names = location_priority?.pickup_location_names;

    const locations = await getLocations(shopify_access_token, store_domain);
    if(!locations) return json({ success: false, message: `unable to fetch location information`});

    let pickup_location_ids = locations?.map(item => item.id);
    let pickup_location_names = locations?.map(item => item.name);
    let pickup_location_pincodes = locations?.map(item => item.zip);

    const inventory_item_id = await getInventoryItemId(shopify_access_token, store_domain, product_variant_id)
    if(!inventory_item_id) return json({ success: false, message: `unable to fetch inventory item id`});

    const inventory_levels = await getInventoryLevels(shopify_access_token, store_domain, inventory_item_id, pickup_location_ids);
    if(!inventory_levels) return json({ success: false, message: `unable to fetch inventory levels information`});

    // priority_wise_pickup_location_names?.unshift(location_priority?.mother_warehouse); // probably that priority includes primary warehouse also
    let pickup_locations = await getPriorityWiseLocations(pickup_location_ids, pickup_location_names, pickup_location_pincodes, priority_wise_pickup_location_names);

    let source_pincode = getSourcePincode(inventory_levels, pickup_locations);
    if(!source_pincode) return json({ success: false, message: `no pickup locations are available for this delivery pincode`});

    const warehouse = await getWarehouseByUserAndOrigin(source_pincode, eshipz_user_id);
    const delay_in_days = getDelayInDays(warehouse?.closing_time, warehouse?.non_operational_dates);
    const logistics_details = await getCustomerSla(source_pincode, destination_pincode, eshipz_user_id);
    let length = logistics_details?.length;
    if(length && length > 0){

      let pincode_serviceability_response = await checkPincodeServiceability(source_pincode, destination_pincode, eshipz_user_id);
      if(pincode_serviceability_response?.status !== "success") return json({ success: false, message:"This pincode is not in service"});

      let is_cod = pincode_serviceability_response?.data?.cod_delivery;
      is_cod = is_cod ? logistics_details?.length === 1 ? logistics_details[0].is_cod : false : false;
      let result = {
          min_edd : getFormattedDate(logistics_details?.[0].sla ?? 0 + delay_in_days),
          max_edd : getFormattedDate(logistics_details?.[length-1].sla ?? 0 + delay_in_days),
          is_cod: is_cod
      }
      return json(result);

    } else {
      return json({ success: false, message: "SLA is not available for this destination"});
    }

  } catch (error) {
    return json({ success: false, message: "SLA is not available for this destination", error: `${error?.toString()}`});
  }

}
