export const getFormattedDate = (days_to_add: number) => {
  let today = new Date();
  // let days_to_add =parseInt(sla_count);
  let resultant_date = new Date(today)
  resultant_date.setDate(resultant_date.getDate() + days_to_add)
  return resultant_date.toISOString().split("T")[0];
}

export const getPriorityWiseLocations = async (pickup_location_ids: string[], pickup_location_names: string[], pickup_location_pincodes: string[], priority_wise_location_names: string[]|undefined) => {
  let pickup_locations = [];
  let m = priority_wise_location_names?.length ?? 0;
  for(let i=0;i<m;i++){
      let n = pickup_location_names?.length ?? 0;
      for(let j=0;j<n;j++){
          if(priority_wise_location_names[i] === pickup_location_names[j]){
              pickup_locations.push({
                  "id": pickup_location_ids[j],
                  "name": pickup_location_names[j],
                  "pincode": pickup_location_pincodes[j]
              });
              break;
          }
      }
  }
  return pickup_locations;
}

export const getDelayInDays = ( closing_time: string|undefined, non_operational_dates: Date[]|undefined) => {

  let dayCounter = 0;

  if(!closing_time || !non_operational_dates) return dayCounter;

  // Get current date in server's time zone
  let currentDate = new Date();
  // let serverCurrentDate = new Date();
  let serverCurrentDate = new Date(currentDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  // Check if the current time crosses the closing time
  let closingHour = parseInt(closing_time?.split(':')[0]);
  let closingMinute = parseInt(closing_time?.split(':')[1]);
  if (serverCurrentDate.getHours() > closingHour || (serverCurrentDate.getHours() === closingHour && serverCurrentDate.getMinutes() > closingMinute)) {
    dayCounter += 1;
  }

  let search_date = serverCurrentDate;
  for(let i =0;i < non_operational_dates?.length; i++){
    if(search_date.toISOString().split('T')[0] === non_operational_dates[i].toISOString().split('T')[0]){
      dayCounter += 1;
      search_date.setDate(search_date.getDate() + 1)
    }
  }
  return dayCounter;
}

export const checkPincodeServiceability = async (source_pincode: string, destination_pincode: string, eshipz_user_id: string) => {

  try{
    let headers = new Headers();
    headers.append("x-api-token", `${eshipz_user_id}`);
    headers.append("Content-Type", "application/json");
    let body = JSON.stringify({ "origin_zip": `${source_pincode}`, "destination_zip": `${destination_pincode}`});
    let response = await fetch(`${process.env.PINCODE_SERVICE_CHECK_API}`, { method: 'POST', headers, body, redirect: 'follow' })
    response = await response.json();
    return response;
  } catch (error) {
    console.log('error :', error);
    return false;
  }

}

export const getMinMaxExpDelDate = (predictions: any[]) => {
  const { minExpDelDate, maxExpDelDate } = predictions.reduce((acc, curr) => {
    if (curr.exp_del_days < acc.minExpDelDays) {
        acc.minExpDelDays = curr.exp_del_days;
        acc.minExpDelDate = curr.exp_del_date;
    }
    if (curr.exp_del_days > acc.maxExpDelDays) {
        acc.maxExpDelDays = curr.exp_del_days;
        acc.maxExpDelDate = curr.exp_del_date;
    }
    return acc;
}, { minExpDelDays: Infinity, maxExpDelDays: -Infinity , minExpDelDate: null, maxExpDelDate: null});

return { minExpDelDate, maxExpDelDate };
}

export const getSourcePincode = (inventory_levels: any[], pickup_locations: any[]) => {
  let n = pickup_locations?.length;
  if(n > 0)
      for(let i = 0; i < n; i++){
          let inventory = inventory_levels.find(item => item.location_id === pickup_locations[i]?.id);
          if(inventory?.available > 0) return pickup_locations[i]?.pincode?.toString();
      }
  return null;
}
