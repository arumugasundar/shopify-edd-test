import { createAdminRestApiClient } from '@shopify/admin-api-client';

export const getLocations = async (shopify_access_token: string, store_domain: string) => {
  try {
    const client = createAdminRestApiClient({ storeDomain: store_domain, apiVersion: '2024-01', accessToken: shopify_access_token });
    let response = await client.get(`/locations.json`);
    if(response.ok){
      response = await response.json()
      return response.locations;
    }
  } catch (error) {
    console.log('error :', error);
    return null;
  }
}

export const getInventoryItemId = async (shopify_access_token: string, store_domain: string, product_variant_id: string) => {
  try {
    const client = createAdminRestApiClient({ storeDomain: store_domain, apiVersion: '2024-01', accessToken: shopify_access_token });
    let response = await client.get(`/variants/${product_variant_id}.json`);
    if(response.ok){
      response = await response.json()
      return response.variant?.inventory_item_id;
    }
  } catch (error) {
    console.log('error :', error);
    return null;
  }
}

export const getInventoryLevels = async (shopify_access_token: string, store_domain: string, inventory_item_id: number, pickup_location_ids: number[]) => {
  try {
    const client = createAdminRestApiClient({ storeDomain: store_domain, apiVersion: '2024-01', accessToken: shopify_access_token });
    let response = await client.get(`/inventory_levels.json?inventory_item_ids=${inventory_item_id}&location_ids=${pickup_location_ids?.join(',')}`);
    if(response.ok){
      response = await response.json()
      return response.inventory_levels;
    }
  } catch (error) {
    console.log('error :', error);
    return null;
  }
}
