import { type ActionFunctionArgs, json } from '@remix-run/node';
import { getUserByStoreUrl } from '~/data/user';
import { checkPincodeServiceability } from '~/data/utils';


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

    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    let req_body = [];
    for(let i=0;i<slug.length;i++) req_body.push({ "origin_pincode": `${source_pincode}`, "destination_pincode": `${destination_pincode}`, "slug": slug[i]})
    let raw = JSON.stringify(req_body);
    let response = await fetch(`${process.env.PREDICT_SLA_API}`, { method: 'POST', headers: myHeaders, body: raw, redirect: 'follow'})
    .then(response => response.text()).then(result => { return result; }).catch(error => { return error;});
    response = JSON.parse(response)
    response = response["data"];

    const { minExpDelDate, maxExpDelDate } = response.reduce((acc: { minExpDelDays: number; minExpDelDate: any; maxExpDelDays: number; maxExpDelDate: any; }, curr: { exp_del_days: number; exp_del_date: any; }) => {
        if (curr.exp_del_days < acc.minExpDelDays) {
          acc.minExpDelDays = curr.exp_del_days;
          acc.minExpDelDate = curr.exp_del_date;
        }
        if (curr.exp_del_days > acc.maxExpDelDays) {
          acc.maxExpDelDays = curr.exp_del_days;
          acc.maxExpDelDate = curr.exp_del_date;
        }
        return acc;
    }, { minExpDelDays: Infinity, maxExpDelDays: -Infinity});

    if(response && (Object.keys(response).length > 0)){
        return json({ min_edd : minExpDelDate?.slice(0,10), max_edd : maxExpDelDate?.slice(0,10), is_cod : false });
    } else {
        return json({ success: false, message: "SLA is not available for this destination"});
    }

  } catch (error) {
      return json({ success: false, message: "SLA is not available for this destination", error: `${error?.toString()}`});
  }

}

const getEddBasicAndCustom = async (source_pincode, destination_pincode, eshipz_user_id, slug) => {
  return json({ success: true, message: `BasicAndCustom`});
}

const getEddIntermediateAndGeneric = async (destination_pincode, eshipz_user_id, slug, product_variant_id, shopify_access_token, store_domain) => {
  return json({ success: true, message: `IntermediateAndGeneric`});
}

const getEddIntermediateAndCustom = async (destination_pincode, eshipz_user_id, slug, product_variant_id, shopify_access_token, store_domain) => {
  return json({ success: true, message: `IntermediateAndCustom`});
}
