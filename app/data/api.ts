const HOST = `${process.env.SHOPIFY_APP_URL}`
const PREDICT_SLA_API = `${process.env.PREDICT_SLA_API}`;

export const getEDDStats = async (request: { product_variant_id: string; destination_pincode: string; origin_pincodes: string[]; }, store_url: string) => {

  try {
    store_url = "boltt-audio.myshopify.com";
    let response = await fetch(`${HOST}/edd?shop=${store_url}`, { method: "POST", body: JSON.stringify(request), redirect: "follow" });
    response = await response.json();
    return response;
  } catch (error) {
    console.log('error :', error);
    return null;
  }

}

export const getSLAPredictions = async (payload: { origin_pincode: string; destination_pincode: string; slug: string; }[]) => {
  try {
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    let response = await fetch(`${PREDICT_SLA_API}`, { method: 'POST', headers: myHeaders, body: JSON.stringify(payload), redirect: 'follow'})
    .then(response => response.text()).then(result => { return result; }).catch(error => { return error;});
    response = JSON.parse(response)
    response = response["data"];
    return response;
  } catch (error) {
    console.log('error :', error);
    return null;
  }
}
